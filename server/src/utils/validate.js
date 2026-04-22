const { createValidationErrorFromZod } = require("./errors");

const REQUEST_TARGETS = ["body", "params", "query"];

function isSchema(candidate) {
  return Boolean(
    candidate &&
      typeof candidate === "object" &&
      typeof candidate.parse === "function" &&
      typeof candidate.safeParse === "function"
  );
}

function normalizeSchemaMap(schemaOrTargets) {
  if (isSchema(schemaOrTargets)) {
    return { body: schemaOrTargets };
  }

  const source =
    schemaOrTargets && typeof schemaOrTargets === "object" && !Array.isArray(schemaOrTargets)
      ? schemaOrTargets
      : null;

  if (!source) {
    throw new TypeError("validate() requires a Zod schema or an object with body/query/params schemas.");
  }

  const entries = REQUEST_TARGETS.filter((target) => isSchema(source[target])).map((target) => [
    target,
    source[target],
  ]);

  if (!entries.length) {
    throw new TypeError("validate() could not find a valid body, query, or params schema.");
  }

  return Object.fromEntries(entries);
}

function parseOrThrow(schema, payload) {
  const result = schema.safeParse(payload);
  if (result.success) {
    return result.data;
  }

  throw createValidationErrorFromZod(result.error);
}

function validate(schemaOrTargets) {
  const schemaMap = normalizeSchemaMap(schemaOrTargets);

  return function validateRequest(req, res, next) {
    try {
      REQUEST_TARGETS.forEach((target) => {
        if (!schemaMap[target]) {
          return;
        }

        req[target] = parseOrThrow(schemaMap[target], req[target] || {});
      });

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = {
  validate,
};
