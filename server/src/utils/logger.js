function serialize(entry) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    ...entry,
  });
}

function log(level, event, fields = {}) {
  const payload = serialize({
    level,
    event,
    ...fields,
  });

  if (level === "error") {
    console.error(payload);
    return;
  }

  console.log(payload);
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
