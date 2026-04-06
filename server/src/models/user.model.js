const { get, run } = require("../config/db");

async function createUser({ email, password, role }) {
  const result = await run(
    "INSERT INTO users (email, password, role) VALUES (?, ?, ?)",
    [email, password, role]
  );

  return {
    id: result.lastID,
    email,
    role,
  };
}

function findUserByEmail(email) {
  return get("SELECT * FROM users WHERE email = ?", [email]);
}

function findUserById(userId) {
  return get("SELECT * FROM users WHERE id = ?", [userId]);
}

function findCustomerProfileByUserId(userId) {
  return get("SELECT * FROM customer_profiles WHERE userId = ?", [userId]);
}

function upsertCustomerProfileByUserId({
  userId,
  fullName = "",
  email = "",
  phone = "",
  avatarUrl = "",
  bio = "",
  profileCompleted = 0,
}) {
  return run(
    `INSERT INTO customer_profiles (
      userId, fullName, email, phone, avatarUrl, bio, profileCompleted
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(userId) DO UPDATE SET
      fullName = excluded.fullName,
      email = excluded.email,
      phone = excluded.phone,
      avatarUrl = excluded.avatarUrl,
      bio = excluded.bio,
      profileCompleted = excluded.profileCompleted`,
    [userId, fullName, email, phone, avatarUrl, bio, profileCompleted ? 1 : 0]
  );
}

module.exports = {
  createUser,
  findCustomerProfileByUserId,
  findUserById,
  findUserByEmail,
  upsertCustomerProfileByUserId,
};
