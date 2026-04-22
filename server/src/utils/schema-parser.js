const { createValidationErrorFromZod } = require("./errors");

function parseSchema(schema, payload) {
  const result = schema.safeParse(payload);
  if (result.success) {
    return result.data;
  }

  throw createValidationErrorFromZod(result.error);
}

module.exports = {
  parseSchema,
};
