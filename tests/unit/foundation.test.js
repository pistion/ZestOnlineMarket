const { createHttpError } = require("../../server/src/utils/api-response");
const { AppError } = require("../../server/src/utils/errors");
const { authSchemas, validateAuthPayload } = require("../../server/src/utils/request-validation");
const { validate } = require("../../server/src/utils/validate");

describe("foundation helpers", () => {
  it("returns an AppError with status and code metadata", () => {
    const error = createHttpError(409, "Duplicate record", {
      code: "DUPLICATE_RECORD",
    });

    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(409);
    expect(error.status).toBe(409);
    expect(error.code).toBe("DUPLICATE_RECORD");
    expect(error.message).toBe("Duplicate record");
  });

  it("normalizes register payloads through the auth schema", () => {
    const payload = validateAuthPayload(
      {
        email: "  PERSON@Example.com ",
        password: "Password123!",
        role: "SELLER",
        returnTo: " /seller/store ",
      },
      "register"
    );

    expect(payload.email).toBe("person@example.com");
    expect(payload.role).toBe("seller");
    expect(payload.returnTo).toBe("/seller/store");
  });

  it("rewrites req.body with parsed data", async () => {
    const middleware = validate(authSchemas.loginBodySchema);
    const req = {
      body: {
        email: " User@example.com ",
        password: "Password123!",
        intentRole: "BUYER",
        returnTo: " /buyer/profile ",
      },
    };

    await new Promise((resolve, reject) => {
      middleware(req, {}, (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });

    expect(req.body).toEqual({
      email: "user@example.com",
      password: "Password123!",
      intentRole: "buyer",
      returnTo: "/buyer/profile",
    });
  });

  it("allows login payloads to use legacy passwords that do not match sign-up strength rules", () => {
    const payload = validateAuthPayload(
      {
        email: " legacy@example.com ",
        password: "abc",
        intentRole: "SELLER",
        returnTo: " /seller/store ",
      },
      "login"
    );

    expect(payload).toEqual({
      email: "legacy@example.com",
      password: "abc",
      intentRole: "seller",
      returnTo: "/seller/store",
    });
  });

  it("keeps strong-password enforcement on registration", () => {
    expect(() =>
      validateAuthPayload(
        {
          email: "person@example.com",
          password: "password",
          role: "buyer",
          returnTo: "/buyer/profile",
        },
        "register"
      )
    ).toThrow(/letters and numbers/i);
  });

  it("forwards AppError details on invalid input", async () => {
    const middleware = validate(authSchemas.loginBodySchema);
    const req = {
      body: {
        email: "not-an-email",
        password: "short",
        intentRole: "buyer",
        returnTo: "/buyer/profile",
      },
    };

    const error = await new Promise((resolve) => {
      middleware(req, {}, (nextError) => resolve(nextError));
    });

    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(Array.isArray(error.details)).toBe(true);
    expect(error.details.length).toBeGreaterThanOrEqual(1);
  });
});
