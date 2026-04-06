const { createApp } = require("./src/app");
const { initDb } = require("./src/config/db");
const { port } = require("./src/config/env");
const { logError, logInfo } = require("./src/utils/logger");

async function startServer() {
  await initDb();

  const app = createApp();
  return app.listen(port, () => {
    logInfo("server.started", {
      port,
      url: `http://localhost:${port}`,
    });
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    logError("server.start_failed", {
      message: error && error.message ? error.message : "Failed to start server",
      stack: error && error.stack ? error.stack : "",
    });
    process.exit(1);
  });
}

module.exports = { startServer };
