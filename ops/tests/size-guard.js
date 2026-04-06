const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const maxLines = 650;
const ignorePatterns = [
  /\.legacy\.js$/,
  new RegExp(`server\\${path.sep}src\\${path.sep}controllers\\${path.sep}store\\.controller\\.js$`),
];
const targets = [
  path.join(root, "server", "src"),
  path.join(root, "ops"),
];

function shouldIgnore(filePath) {
  return ignorePatterns.some((pattern) => pattern.test(filePath));
}

function collectFiles(targetPath) {
  if (!fs.existsSync(targetPath)) {
    return [];
  }

  const stat = fs.statSync(targetPath);
  if (stat.isFile()) {
    return targetPath.endsWith(".js") ? [targetPath] : [];
  }

  return fs.readdirSync(targetPath).flatMap((entry) =>
    collectFiles(path.join(targetPath, entry))
  );
}

function run() {
  const failures = [];
  const files = targets.flatMap(collectFiles).filter((filePath) => !shouldIgnore(filePath));

  files.forEach((filePath) => {
    const lineCount = fs.readFileSync(filePath, "utf8").split(/\r?\n/).length;
    if (lineCount > maxLines) {
      failures.push(`${path.relative(root, filePath)} exceeds ${maxLines} lines (${lineCount}).`);
    }
  });

  if (failures.length) {
    failures.forEach((failure) => console.error(failure));
    process.exit(1);
  }

  console.log("Size guard checks passed.");
}

run();
