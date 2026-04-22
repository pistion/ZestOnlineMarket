const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { spawn } = require("child_process");
const { Client } = require("pg");

const { databaseUrl, pgConfig } = require("../../server/src/config/env");

const root = path.resolve(__dirname, "..", "..");
const port = 3211;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildPgClient() {
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

async function request(routePath, options = {}) {
  const response = await fetch(`http://127.0.0.1:${port}${routePath}`, {
    redirect: "manual",
    ...options,
  });
  const body = await response.text();
  return {
    statusCode: response.status,
    body,
    headers: Object.fromEntries(response.headers.entries()),
    setCookies:
      typeof response.headers.getSetCookie === "function"
        ? response.headers.getSetCookie()
        : [response.headers.get("set-cookie")].filter(Boolean),
  };
}

function extractCookieHeader(setCookies = []) {
  return setCookies
    .map((cookie) => String(cookie || "").split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
}

function extractCsrfToken(body = "") {
  const match = String(body || "").match(/<meta\s+name="csrf-token"\s+content="([^"]*)"/i);
  return match ? match[1] : "";
}

async function waitForServer() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 12_000) {
    try {
      const response = await request("/");
      if (response.statusCode === 200) {
        return;
      }
    } catch (error) {
      // keep waiting
    }

    await wait(400);
  }

  throw new Error("Integration server did not become ready in time.");
}

test("auth writes require csrf and bearer writes remain usable", async (t) => {
  const env = {
    ...process.env,
    PORT: String(port),
    JWT_SECRET: process.env.JWT_SECRET || "integration-test-secret-1234567890",
    APP_ENV: process.env.APP_ENV || "local",
  };

  const serverProcess = spawn(process.execPath, ["server.js"], {
    cwd: root,
    env,
    stdio: "inherit",
  });

  const cleanupEmails = [];
  t.after(async () => {
    if (!serverProcess.killed) {
      serverProcess.kill("SIGTERM");
      await new Promise((resolve) => serverProcess.once("exit", resolve));
    }

    if (!cleanupEmails.length) {
      return;
    }

    const client = buildPgClient();
    try {
      await client.connect();
      await client.query("delete from users where email = any($1::text[])", [cleanupEmails]);
    } finally {
      await client.end();
    }
  });

  await waitForServer();

  const blockedEmail = `csrf_blocked_${Date.now()}@example.com`;
  const blockedResponse = await request("/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: blockedEmail,
      password: "Password123!",
      confirmPassword: "Password123!",
      role: "seller",
    }),
  });
  const blockedPayload = JSON.parse(blockedResponse.body);
  assert.equal(blockedResponse.statusCode, 403);
  assert.equal(blockedPayload.success, false);

  const authPageResponse = await request("/auth/signup");
  const cookieHeader = extractCookieHeader(authPageResponse.setCookies);
  const csrfToken = extractCsrfToken(authPageResponse.body);

  assert.ok(cookieHeader);
  assert.ok(csrfToken);

  const sellerEmail = `csrf_seller_${Date.now()}@example.com`;
  cleanupEmails.push(sellerEmail);

  const registerResponse = await request("/auth/register", {
    method: "POST",
    headers: {
      Cookie: cookieHeader,
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
    },
    body: JSON.stringify({
      email: sellerEmail,
      password: "Password123!",
      confirmPassword: "Password123!",
      role: "seller",
    }),
  });
  const registerPayload = JSON.parse(registerResponse.body);
  assert.equal(registerResponse.statusCode, 200);
  assert.equal(registerPayload.success, true);
  assert.ok(registerPayload.token);

  const handle = `csrf-${Date.now()}`;
  const storeResponse = await request("/api/store", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${registerPayload.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      storeName: "CSRF Test Store",
      handle,
      tagline: "CSRF integration validation",
      about: "Created during integration testing.",
      accentColor: "#2563eb",
      avatarUrl: "",
      coverUrl: "",
      socials: {
        instagram: "",
        facebook: "",
        tiktok: "",
        xhandle: "",
      },
      product: {
        name: "CSRF Test Product",
        description: "Created during integration testing.",
        price: 12,
        delivery: "pickup",
        location: "Port Moresby",
        transportFee: 0,
        images: [],
      },
    }),
  });
  const storePayload = JSON.parse(storeResponse.body);
  assert.equal(storeResponse.statusCode, 200);
  assert.equal(storePayload.success, true);
});
