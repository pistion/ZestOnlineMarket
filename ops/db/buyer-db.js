const { Client } = require("pg");

const { databaseUrl, pgConfig } = require("./config");

function buildClient() {
  return new Client(
    databaseUrl
      ? { connectionString: databaseUrl }
      : {
          host: pgConfig.host,
          port: pgConfig.port,
          database: pgConfig.database,
          user: pgConfig.user,
          password: pgConfig.password,
        }
  );
}

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function getBuyerByEmail(client, email) {
  const result = await client.query(
    `
      select
        u.id as user_id,
        u.email,
        u.role,
        cp.id as customer_profile_id,
        cp.full_name,
        cp.phone,
        cp.avatar_url,
        cp.bio,
        cp.profile_completed,
        cp.created_at,
        cp.updated_at
      from users u
      left join customer_profiles cp on cp.user_id = u.id
      where lower(u.email) = lower($1)
      limit 1
    `,
    [email]
  );

  return result.rows[0] || null;
}

async function summary(client) {
  const result = await client.query(
    `
      select
        (select count(*) from users where role = 'buyer') as buyer_users,
        (select count(*) from customer_profiles) as buyer_profiles,
        (select count(*) from customer_preferences) as buyer_preferences,
        (select count(*) from customer_followed_stores) as followed_store_links,
        (select count(*) from wishlists) as wishlist_rows,
        (select count(*) from orders) as order_rows
    `
  );

  print({
    database: pgConfig.database,
    host: pgConfig.host,
    port: pgConfig.port,
    summary: result.rows[0] || {},
  });
}

async function profile(client, email) {
  if (!email) {
    throw new Error("Provide an email: npm run db:buyer -- profile buyer@example.com");
  }

  const buyer = await getBuyerByEmail(client, email);
  if (!buyer) {
    throw new Error(`Buyer not found for email: ${email}`);
  }

  const preferences = buyer.customer_profile_id
    ? await client.query(
        `
          select
            popular_categories,
            favorite_templates,
            viewed_products,
            interaction_summary,
            created_at,
            updated_at
          from customer_preferences
          where customer_profile_id = $1
          limit 1
        `,
        [buyer.customer_profile_id]
      )
    : { rows: [] };

  print({
    buyer,
    preferences: preferences.rows[0] || null,
  });
}

async function following(client, email) {
  if (!email) {
    throw new Error("Provide an email: npm run db:buyer -- following buyer@example.com");
  }

  const buyer = await getBuyerByEmail(client, email);
  if (!buyer || !buyer.customer_profile_id) {
    throw new Error(`Buyer profile not found for email: ${email}`);
  }

  const result = await client.query(
    `
      select
        s.id as store_id,
        s.handle,
        s.store_name,
        s.template_key,
        s.tagline,
        cfs.created_at as followed_at
      from customer_followed_stores cfs
      join stores s on s.id = cfs.store_id
      where cfs.customer_profile_id = $1
      order by cfs.created_at desc
    `,
    [buyer.customer_profile_id]
  );

  print({
    buyer: {
      email: buyer.email,
      customerProfileId: buyer.customer_profile_id,
    },
    following: result.rows,
  });
}

async function run() {
  const command = String(process.argv[2] || "summary").trim().toLowerCase();
  const email = String(process.argv[3] || "").trim();
  const client = buildClient();

  await client.connect();

  try {
    if (command === "summary") {
      await summary(client);
      return;
    }

    if (command === "profile") {
      await profile(client, email);
      return;
    }

    if (command === "following") {
      await following(client, email);
      return;
    }

    throw new Error(
      "Unknown command. Use one of: summary, profile <email>, following <email>"
    );
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
