const winston = require("winston");

const { appEnv } = require("../config/env");

const isLocal = appEnv === "local";

const baseFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true })
);

const prettyFormat = winston.format.printf(({ timestamp, level, event, message, stack, ...meta }) => {
  const label = event || message || "log";
  const metaKeys = Object.keys(meta || {});
  const metaSuffix = metaKeys.length ? ` ${JSON.stringify(meta)}` : "";
  const stackSuffix = stack ? `\n${stack}` : "";
  return `${timestamp} ${level} ${label}${metaSuffix}${stackSuffix}`;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isLocal ? "debug" : "info"),
  format: isLocal
    ? winston.format.combine(baseFormat, winston.format.colorize({ all: true }), prettyFormat)
    : winston.format.combine(baseFormat, winston.format.json()),
  transports: [new winston.transports.Console()],
});

function log(level, event, fields = {}) {
  logger.log({
    level,
    event,
    message: event,
    ...fields,
  });
}

function logInfo(event, fields) {
  log("info", event, fields);
}

function logWarn(event, fields) {
  log("warn", event, fields);
}

function logError(event, fields) {
  log("error", event, fields);
}

module.exports = {
  logError,
  logInfo,
  logWarn,
};
