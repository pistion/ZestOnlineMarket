const {
  buildSocialAuthUrl,
  buildSocialConfigurationHint,
  buildSocialStateToken,
  getSocialProviderLabel,
  normalizeSocialProvider,
  verifySocialStateToken,
} = require("../../server/src/services/social-auth.service");

describe("social auth helpers", () => {
  it("normalizes supported providers only", () => {
    expect(normalizeSocialProvider(" GOOGLE ")).toBe("google");
    expect(normalizeSocialProvider("facebook")).toBe("facebook");
    expect(normalizeSocialProvider("github")).toBe("");
  });

  it("builds provider-specific configuration hints", () => {
    expect(buildSocialConfigurationHint("google")).toMatch(/GOOGLE_CLIENT_ID/);
    expect(buildSocialConfigurationHint("facebook")).toMatch(/FACEBOOK_CLIENT_ID/);
  });

  it("creates a Google auth URL with the expected query params", () => {
    const url = new URL(
      buildSocialAuthUrl("google", {
        state: "signed-state",
        config: {
          provider: "google",
          clientId: "google-client-id",
          clientSecret: "ignored-in-url",
          redirectUri: "https://app.example.com/auth/oauth/google/callback",
          scopes: ["openid", "email", "profile"],
        },
      })
    );

    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("client_id")).toBe("google-client-id");
    expect(url.searchParams.get("redirect_uri")).toBe("https://app.example.com/auth/oauth/google/callback");
    expect(url.searchParams.get("state")).toBe("signed-state");
    expect(url.searchParams.get("scope")).toBe("openid email profile");
  });

  it("creates a Facebook auth URL with the expected query params", () => {
    const url = new URL(
      buildSocialAuthUrl("facebook", {
        state: "signed-state",
        config: {
          provider: "facebook",
          clientId: "facebook-client-id",
          clientSecret: "ignored-in-url",
          redirectUri: "https://app.example.com/auth/oauth/facebook/callback",
          scopes: ["email", "public_profile"],
        },
      })
    );

    expect(url.origin).toBe("https://www.facebook.com");
    expect(url.searchParams.get("client_id")).toBe("facebook-client-id");
    expect(url.searchParams.get("redirect_uri")).toBe("https://app.example.com/auth/oauth/facebook/callback");
    expect(url.searchParams.get("state")).toBe("signed-state");
    expect(url.searchParams.get("scope")).toBe("email,public_profile");
  });

  it("round-trips the signed social auth state payload", () => {
    const token = buildSocialStateToken({
      provider: "google",
      role: "seller",
      returnTo: "/seller/store",
      nonce: "nonce-123",
    });

    expect(verifySocialStateToken(token)).toMatchObject({
      provider: "google",
      role: "seller",
      returnTo: "/seller/store",
      nonce: "nonce-123",
      type: "social-auth-state",
    });
  });

  it("uses friendly provider labels", () => {
    expect(getSocialProviderLabel("google")).toBe("Google");
    expect(getSocialProviderLabel("facebook")).toBe("Facebook");
    expect(getSocialProviderLabel("unknown")).toBe("Social provider");
  });
});
