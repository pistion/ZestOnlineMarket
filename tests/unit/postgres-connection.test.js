const {
  resolvePgSslConfig,
} = require("../../server/src/database/postgres/connection");

describe("postgres connection helpers", () => {
  it("enables ssl when the connection string requires it", () => {
    const ssl = resolvePgSslConfig({
      appEnv: "production",
      connectionString: "postgresql://user:pass@db.example.com:5432/app?sslmode=require",
      sslEnabled: "",
      sslMode: "",
      rejectUnauthorized: false,
    });

    expect(ssl).toEqual({
      rejectUnauthorized: false,
    });
  });

  it("allows explicit ssl disablement", () => {
    const ssl = resolvePgSslConfig({
      appEnv: "production",
      connectionString: "postgresql://user:pass@db.example.com:5432/app?sslmode=require",
      sslEnabled: "false",
      sslMode: "",
      rejectUnauthorized: false,
    });

    expect(ssl).toBe(false);
  });

  it("defaults to ssl for non-local hosted databases", () => {
    const ssl = resolvePgSslConfig({
      appEnv: "production",
      connectionString: "postgresql://user:pass@db.example.com:5432/app",
      sslEnabled: "",
      sslMode: "",
      rejectUnauthorized: false,
    });

    expect(ssl).toEqual({
      rejectUnauthorized: false,
    });
  });

  it("keeps local development databases on plain tcp by default", () => {
    const ssl = resolvePgSslConfig({
      appEnv: "local",
      connectionString: "postgresql://user:pass@127.0.0.1:5432/app",
      sslEnabled: "",
      sslMode: "",
      rejectUnauthorized: false,
    });

    expect(ssl).toBe(false);
  });

  it("uses strict certificate verification when requested", () => {
    const ssl = resolvePgSslConfig({
      appEnv: "production",
      connectionString: "postgresql://user:pass@db.example.com:5432/app",
      sslEnabled: "",
      sslMode: "verify-full",
      rejectUnauthorized: false,
    });

    expect(ssl).toEqual({
      rejectUnauthorized: true,
    });
  });
});
