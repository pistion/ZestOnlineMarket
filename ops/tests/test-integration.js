const path = require("path");
const { spawn } = require("child_process");
const { Client } = require("pg");

const { databaseUrl, pgConfig } = require("../db/config");

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

async function runIntegrationTests() {
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

  try {
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
        role: "seller",
      }),
    });
    const blockedPayload = JSON.parse(blockedResponse.body);
    if (blockedResponse.statusCode !== 403 || blockedPayload.success !== false) {
      throw new Error("CSRF protection did not block an unauthenticated registration write.");
    }

    const authPageResponse = await request("/auth/signup");
    const cookieHeader = extractCookieHeader(authPageResponse.setCookies);
    const csrfToken = extractCsrfToken(authPageResponse.body);
    if (!cookieHeader || !csrfToken) {
      throw new Error("Could not establish a CSRF session from the auth page.");
    }

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
        role: "seller",
      }),
    });
    const registerPayload = JSON.parse(registerResponse.body);
    if (registerResponse.statusCode !== 200 || registerPayload.success !== true || !registerPayload.token) {
      throw new Error("CSRF-protected registration failed during integration testing.");
    }

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
    if (storeResponse.statusCode !== 200 || storePayload.success !== true) {
      throw new Error("Bearer-authenticated seller write failed during integration testing.");
    }

    console.log("Integration tests passed.");
  } finally {
    if (!serverProcess.killed) {
      serverProcess.kill("SIGTERM");
      await new Promise((resolve) => serverProcess.once("exit", resolve));
    }

    if (cleanupEmails.length) {
      const client = buildPgClient();
      try {
        await client.connect();
        await client.query("delete from users where email = any($1::text[])", [cleanupEmails]);
      } finally {
        await client.end();
      }
    }
  }
}

if (require.main === module) {
  runIntegrationTests().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}

module.exports = {
  runIntegrationTests,
};
