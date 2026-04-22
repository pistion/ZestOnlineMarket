const {
  createUser: createLegacyUser,
  findCustomerProfileByUserId: findLegacyCustomerProfileByUserId,
  findUserByEmail: findLegacyUserByEmail,
  findUserById: findLegacyUserById,
  upsertCustomerProfileByUserId: upsertLegacyCustomerProfileByUserId,
} = require("../models/user.model");
const { getPostgresExecutor, resolveIdentitySource } = require("./repository-source");
const { deriveBuyerProfileCompleted } = require("../utils/profile-state");

function toNumber(value) {
  if (value == null || value === "") {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}

function toJsonb(knex, value) {
  return knex.raw("?::jsonb", [JSON.stringify(value == null ? {} : value)]);
}

function mapPostgresUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: toNumber(row.id),
    email: row.email,
    password: row.password_hash,
    role: row.role,
    status: row.status,
    fullName: row.full_name || "",
    phone: row.phone || "",
    avatarUrl: row.avatar_media_url || "",
  };
}

async function findUserByEmail(email, options = {}) {
  const source = resolveIdentitySource(options);
  if (source === "sqlite") {
    return findLegacyUserByEmail(email);
  }

  const knex = getPostgresExecutor(options);
  const row = await knex("users").where({ email }).first();
  return mapPostgresUser(row);
}

async function findUserById(userId, options = {}) {
  const source = resolveIdentitySource(options);
  if (source === "sqlite") {
    return findLegacyUserById(userId);
  }

  const knex = getPostgresExecutor(options);
  const row = await knex("users").where({ id: userId }).first();
  return mapPostgresUser(row);
}

async function createUser({ email, password, role, fullName = "", avatarUrl = "" }, options = {}) {
  const source = resolveIdentitySource(options);
  if (source === "sqlite") {
    const user = await createLegacyUser({
      email,
      password,
      role,
    });

    if (role === "buyer") {
      const legacyProfile = await findLegacyCustomerProfileByUserId(user.id);
      const profileCompleted = deriveBuyerProfileCompleted(legacyProfile);

      await upsertLegacyCustomerProfileByUserId({
        userId: user.id,
        fullName: legacyProfile && legacyProfile.fullName ? legacyProfile.fullName : "",
        email,
        phone: legacyProfile && legacyProfile.phone ? legacyProfile.phone : "",
        avatarUrl: legacyProfile && legacyProfile.avatarUrl ? legacyProfile.avatarUrl : "",
        bio: legacyProfile && legacyProfile.bio ? legacyProfile.bio : "",
        profileCompleted,
      });
    }

    return user;
  }

  const knex = getPostgresExecutor(options);
  const [row] = await knex("users")
    .insert({
      email,
      password_hash: password,
      role,
      status: "active",
      full_name: fullName || null,
      avatar_media_url: avatarUrl || null,
      subscription_status: "inactive",
    })
    .returning(["id", "email", "role"]);

  if (role === "buyer") {
    const [profileRow] = await knex("customer_profiles")
      .insert({
        user_id: row.id,
        email,
        full_name: fullName || null,
        avatar_url: avatarUrl || null,
        profile_completed: false,
      })
      .onConflict("user_id")
      .merge({
        email,
        profile_completed: false,
        updated_at: knex.fn.now(),
      })
      .returning(["id"]);

    if (profileRow && profileRow.id) {
      await knex("customer_preferences")
        .insert({
          customer_profile_id: profileRow.id,
          popular_categories: toJsonb(knex, []),
          favorite_templates: toJsonb(knex, []),
          viewed_products: toJsonb(knex, []),
          interaction_summary: toJsonb(knex, {}),
        })
        .onConflict("customer_profile_id")
        .ignore();
    }
  }

  return {
    id: toNumber(row.id),
    email: row.email,
    role: row.role,
  };
}

async function updateUserProfileById(userId, updates = {}, options = {}) {
  const source = resolveIdentitySource(options);
  if (source === "sqlite") {
    return findLegacyUserById(userId);
  }

  const knex = getPostgresExecutor(options);
  const patch = {};
  if (typeof updates.fullName === "string" && updates.fullName.trim()) {
    patch.full_name = updates.fullName.trim();
  }
  if (typeof updates.avatarUrl === "string" && updates.avatarUrl.trim()) {
    patch.avatar_media_url = updates.avatarUrl.trim();
  }
  if (!Object.keys(patch).length) {
    return findUserById(userId, options);
  }

  patch.updated_at = knex.fn.now();
  await knex("users").where({ id: userId }).update(patch);
  return findUserById(userId, options);
}

async function touchUserLastLogin(userId, options = {}) {
  const source = resolveIdentitySource(options);
  if (source === "sqlite") {
    return null;
  }

  const knex = getPostgresExecutor(options);
  await knex("users")
    .where({ id: userId })
    .update({
      last_login: knex.fn.now(),
      updated_at: knex.fn.now(),
    });

  return null;
}

async function findUserByAuthProvider(provider, providerSubject, options = {}) {
  const source = resolveIdentitySource(options);
  if (source === "sqlite") {
    return null;
  }

  const knex = getPostgresExecutor(options);
  const row = await knex("user_auth_providers as uap")
    .join("users as u", "u.id", "uap.user_id")
    .select("u.*")
    .where({
      "uap.provider": provider,
      "uap.provider_subject": providerSubject,
    })
    .first();

  return mapPostgresUser(row);
}

async function linkUserAuthProvider(userId, payload, options = {}) {
  const source = resolveIdentitySource(options);
  if (source === "sqlite") {
    return null;
  }

  const knex = getPostgresExecutor(options);
  await knex("user_auth_providers")
    .insert({
      user_id: userId,
      provider: payload.provider,
      provider_subject: payload.providerSubject,
      provider_email: payload.email || null,
      provider_display_name: payload.displayName || null,
      provider_avatar_url: payload.avatarUrl || null,
    })
    .onConflict(["user_id", "provider"])
    .merge({
      provider_subject: payload.providerSubject,
      provider_email: payload.email || null,
      provider_display_name: payload.displayName || null,
      provider_avatar_url: payload.avatarUrl || null,
      updated_at: knex.fn.now(),
    });

  return null;
}

module.exports = {
  createUser,
  create_user: createUser,
  findUserById,
  find_user_by_id: findUserById,
  findUserByAuthProvider,
  findUserByEmail,
  find_user_by_email: findUserByEmail,
  linkUserAuthProvider,
  touchUserLastLogin,
  updateUserProfileById,
};
