const {
  closeReader,
  completeMigrationRun,
  createMigrationRun,
  insertRow,
  openLegacyReader,
  openPostgres,
  recordMigrationFailure,
  recordMigrationMapping,
  syncIdentitySequence,
  toJson,
  upsertLegacyIdentityRow,
} = require("./helpers");
const { deriveBuyerProfileCompleted, deriveStoreProfileCompleted } = require("../../utils/profile-state");

function mapLegacyUser(row) {
  return {
    id: row.id,
    legacy_id: row.id,
    email: row.email,
    password_hash: row.password,
    role: row.role,
    status: "active",
    full_name: null,
    phone: null,
    avatar_media_url: null,
    last_login: null,
    subscription_plan_id: null,
    subscription_start_date: null,
    subscription_end_date: null,
    subscription_auto_renew: false,
    subscription_status: "inactive",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function mapStarterCustomerProfile(userRow) {
  return {
    legacy_id: null,
    user_id: userRow.id,
    full_name: null,
    email: userRow.email,
    phone: null,
    avatar_url: null,
    bio: null,
    profile_completed: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(String(value || "[]"));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function parseJsonObject(value) {
  try {
    const parsed = JSON.parse(String(value || "{}"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    return {};
  }
}

function mapLegacyCustomerProfile(row) {
  return {
    legacy_id: row.id,
    user_id: row.userId,
    full_name: row.fullName || null,
    email: row.email || null,
    phone: row.phone || null,
    avatar_url: row.avatarUrl || null,
    bio: row.bio || null,
    profile_completed: deriveBuyerProfileCompleted(row),
    updated_at: new Date().toISOString(),
  };
}

function mapLegacyCustomerPreference(row, profileId) {
  return {
    customer_profile_id: profileId,
    popular_categories: toJson(parseJsonArray(row.favoriteCategories)),
    favorite_templates: toJson(parseJsonArray(row.favoriteTemplates)),
    viewed_products: toJson(parseJsonArray(row.viewedItems)),
    interaction_summary: toJson(parseJsonObject(row.interactionSummary)),
    updated_at: new Date().toISOString(),
  };
}

function mapLegacyStore(row) {
  return {
    id: row.id,
    legacy_id: row.id,
    owner_user_id: row.userId,
    handle: row.handle,
    store_name: row.storeName,
    tagline: row.tagline || null,
    description: row.about || null,
    template_key: row.templateKey || "products",
    logo_media_url: row.avatarUrl || null,
    cover_media_url: row.coverUrl || null,
    profile_completed: deriveStoreProfileCompleted(row),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function mapLegacyStoreSettings(row) {
  return {
    store_id: row.id,
    currency_code: "PGK",
    default_language: "en",
    accent_color: row.accentColor || "#2563eb",
    shipping_profile_id: null,
    theme_settings: toJson({}),
    color_palette: toJson({}),
    font_choices: toJson({}),
    layout_preferences: toJson({}),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function mapSocialRows(row) {
  return [
    ["instagram", row.instagram],
    ["facebook", row.facebook],
    ["tiktok", row.tiktok],
    ["xhandle", row.xhandle],
  ]
    .filter(([, handleOrUrl]) => String(handleOrUrl || "").trim())
    .map(([platform, handleOrUrl]) => ({
      store_id: row.id,
      platform,
      handle_or_url: String(handleOrUrl).trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
}

async function migrateIdentityAndStores() {
  const legacy = await openLegacyReader();
  const knex = await openPostgres();
  const runId = await createMigrationRun(knex, {
    name: "identity-store-etl",
    stage: "identity-store",
    metadata: {
      source: "sqlite",
      target: "postgres",
    },
  });

  const stats = {
    usersRead: 0,
    usersMigrated: 0,
    profilesCreated: 0,
    preferencesMigrated: 0,
    storesRead: 0,
    storesMigrated: 0,
    socialsCreated: 0,
    failures: 0,
  };

  try {
    const users = await legacy.all("SELECT * FROM users ORDER BY id ASC");
    stats.usersRead = users.length;

    for (const userRow of users) {
      try {
        await upsertLegacyIdentityRow(knex, "users", mapLegacyUser(userRow), ["legacy_id"]);
        await recordMigrationMapping(knex, runId, "users", userRow.id, userRow.id, userRow.email);
        stats.usersMigrated += 1;
      } catch (error) {
        stats.failures += 1;
        await recordMigrationFailure(
          knex,
          runId,
          "users",
          userRow.id,
          "upsert",
          error.message,
          { email: userRow.email }
        );
      }
    }

    const legacyProfiles = await legacy.all("SELECT * FROM customer_profiles ORDER BY id ASC");
    const buyerUsers = users.filter((userRow) => String(userRow.role).trim().toLowerCase() === "buyer");
    const legacyProfilesByUserId = new Map(legacyProfiles.map((row) => [Number(row.userId), row]));
    const profileIdMap = new Map();

    for (const userRow of buyerUsers) {
      try {
        const legacyProfile = legacyProfilesByUserId.get(Number(userRow.id));
        const profileData = legacyProfile
          ? mapLegacyCustomerProfile(legacyProfile)
          : mapStarterCustomerProfile(userRow);

        const [profileRow] = await knex("customer_profiles")
          .insert(profileData)
          .onConflict("user_id")
          .merge({
            legacy_id: profileData.legacy_id,
            full_name: profileData.full_name,
            email: profileData.email || userRow.email,
            phone: profileData.phone,
            avatar_url: profileData.avatar_url,
            bio: profileData.bio,
            profile_completed: profileData.profile_completed,
            updated_at: knex.fn.now(),
          })
          .returning(["id"]);

        const newProfileId = profileRow && profileRow.id ? Number(profileRow.id) : null;
        if (legacyProfile && newProfileId != null) {
          profileIdMap.set(Number(legacyProfile.id), newProfileId);
        }

        await recordMigrationMapping(
          knex,
          runId,
          "customer_profiles",
          legacyProfile ? legacyProfile.id : null,
          newProfileId,
          userRow.email
        );
        stats.profilesCreated += 1;
      } catch (error) {
        stats.failures += 1;
        await recordMigrationFailure(
          knex,
          runId,
          "customer_profiles",
          userRow.id,
          "upsert",
          error.message,
          { email: userRow.email }
        );
      }
    }

    const legacyPreferences = await legacy.all("SELECT * FROM customer_preferences ORDER BY id ASC");
    for (const preferenceRow of legacyPreferences) {
      try {
        const profileId = profileIdMap.get(Number(preferenceRow.customerProfileId));
        if (!profileId) {
          throw new Error(
            `Legacy customer preference references missing profile ${preferenceRow.customerProfileId}`
          );
        }

        await knex("customer_preferences")
          .insert(mapLegacyCustomerPreference(preferenceRow, profileId))
          .onConflict("customer_profile_id")
          .merge({
            popular_categories: parseJsonArray(preferenceRow.favoriteCategories),
            favorite_templates: parseJsonArray(preferenceRow.favoriteTemplates),
            viewed_products: parseJsonArray(preferenceRow.viewedItems),
            interaction_summary: parseJsonObject(preferenceRow.interactionSummary),
            updated_at: knex.fn.now(),
          });

        await recordMigrationMapping(
          knex,
          runId,
          "customer_preferences",
          preferenceRow.id,
          profileId,
          String(preferenceRow.customerProfileId)
        );
        stats.preferencesMigrated += 1;
      } catch (error) {
        stats.failures += 1;
        await recordMigrationFailure(
          knex,
          runId,
          "customer_preferences",
          preferenceRow.id,
          "upsert",
          error.message,
          { customerProfileId: preferenceRow.customerProfileId }
        );
      }
    }

    const stores = await legacy.all("SELECT * FROM stores ORDER BY id ASC");
    const knownUserIds = new Set(users.map((userRow) => Number(userRow.id)));
    stats.storesRead = stores.length;

    for (const storeRow of stores) {
      try {
        if (!knownUserIds.has(Number(storeRow.userId))) {
          throw new Error(`Legacy store references missing user ${storeRow.userId}`);
        }

        await upsertLegacyIdentityRow(knex, "stores", mapLegacyStore(storeRow), ["legacy_id"]);
        await knex("store_settings")
          .insert(mapLegacyStoreSettings(storeRow))
          .onConflict("store_id")
          .merge({
            accent_color: storeRow.accentColor || "#2563eb",
            updated_at: knex.fn.now(),
          });

        await knex("store_social_links").where({ store_id: storeRow.id }).del();
        const socialRows = mapSocialRows(storeRow);
        if (socialRows.length) {
          await insertRow(knex, "store_social_links", socialRows);
          stats.socialsCreated += socialRows.length;
        }

        await recordMigrationMapping(
          knex,
          runId,
          "stores",
          storeRow.id,
          storeRow.id,
          storeRow.handle || null
        );
        stats.storesMigrated += 1;
      } catch (error) {
        stats.failures += 1;
        await recordMigrationFailure(
          knex,
          runId,
          "stores",
          storeRow.id,
          "upsert",
          error.message,
          {
            userId: storeRow.userId,
            handle: storeRow.handle,
            storeName: storeRow.storeName,
          }
        );
      }
    }

    await syncIdentitySequence(knex, "users");
    await syncIdentitySequence(knex, "customer_profiles");
    await syncIdentitySequence(knex, "stores");
    await syncIdentitySequence(knex, "store_settings");
    await syncIdentitySequence(knex, "store_social_links");

    await completeMigrationRun(knex, runId, {
      status: stats.failures ? "completed_with_failures" : "completed",
      metadata: stats,
    });

    return {
      runId,
      stats,
    };
  } catch (error) {
    await completeMigrationRun(knex, runId, {
      status: "failed",
      metadata: {
        ...stats,
        error: error.message,
      },
    });
    throw error;
  } finally {
    await closeReader(legacy);
  }
}

module.exports = {
  migrateIdentityAndStores,
};
