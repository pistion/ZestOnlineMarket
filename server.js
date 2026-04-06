const { startServer } = require("./server/server");
const { logError } = require("./server/src/utils/logger");

startServer().catch((error) => {
  logError("server.root_start_failed", {
    message: error && error.message ? error.message : "Failed to start Zest Online Market",
    stack: error && error.stack ? error.stack : "",
  });
  process.exit(1);
});
