const { z } = require("zod");

const roleValues = ["buyer", "seller"];

const emailSchema = z.preprocess(
  (value) => (value == null ? "" : String(value).trim()),
  z
    .string()
    .min(1, "Email is required")
    .max(120, "Email is too long")
    .email("Email format is invalid")
).transform((value) => value.toLowerCase());

const registerPasswordSchema = z.preprocess(
  (value) => (value == null ? "" : String(value)),
  z
    .string()
    .min(8, "Password must be between 8 and 128 characters")
    .max(128, "Password must be between 8 and 128 characters")
    .refine((value) => /[a-z]/i.test(value) && /\d/.test(value), {
      message: "Password must include letters and numbers",
    })
);

const loginPasswordSchema = z.preprocess(
  (value) => (value == null ? "" : String(value)),
  z
    .string()
    .min(1, "Password is required")
    .max(128, "Password is too long")
);

const roleSchema = z
  .preprocess((value) => (value == null ? "" : String(value).trim().toLowerCase()), z.string())
  .refine((value) => roleValues.includes(value), {
    message: "Invalid role",
  });

const optionalRoleSchema = z.preprocess(
  (value) => (value == null ? "" : String(value).trim().toLowerCase()),
  z.string()
).refine((value) => value === "" || roleValues.includes(value), {
  message: "Invalid role",
});

const optionalInternalPathSchema = z.preprocess(
  (value) => (value == null ? "" : String(value).trim()),
  z.string().max(512, "Return path is too long")
);

const registerBodySchema = z.object({
  email: emailSchema,
  password: registerPasswordSchema,
  confirmPassword: registerPasswordSchema,
  role: roleSchema,
  returnTo: optionalInternalPathSchema,
}).refine((value) => value.password === value.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const loginBodySchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
  intentRole: optionalRoleSchema,
  returnTo: optionalInternalPathSchema,
});

module.exports = {
  loginBodySchema,
  registerBodySchema,
};
