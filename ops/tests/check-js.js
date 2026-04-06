const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..", "..");
const targets = [
  path.join(root, "server.js"),
  path.join(root, "knexfile.js"),
  path.join(root, "server", "server.js"),
  path.join(root, "server", "src"),
  path.join(root, "public", "assets", "js"),
  path.join(root, "ops"),
];

function listJavaScriptFiles(targetPath) {
  if (!fs.existsSync(targetPath)) {
    return [];
  }

  const stat = fs.statSync(targetPath);
  if (stat.isFile()) {
    return targetPath.endsWith(".js") ? [targetPath] : [];
  }

  return fs.readdirSync(targetPath).flatMap((entry) =>
    listJavaScriptFiles(path.join(targetPath, entry))
  );
}

const files = [...new Set(targets.flatMap(listJavaScriptFiles))].filter(
  (filePath) => !filePath.includes(`${path.sep}node_modules${path.sep}`)
);

for (const filePath of files) {
  const result = spawnSync(process.execPath, ["--check", filePath], {
    cwd: root,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

console.log(`Checked ${files.length} JavaScript files.`);
