const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..", "..");

const forbiddenRuntimePaths = [
  "server/public",
  "server/project_map.json",
  "server/users.db",
  "server/uploads",
  "tmp-server-err.log",
  "tmp-server-out.log",
  path.join("archive", "sandbox-server.err.log"),
  path.join("archive", "sandbox-server.out.log"),
];

function normalizeRelativePath(relativePath) {
  return relativePath.split(/[\\/]+/).join(path.sep);
}

function gitTracked(relativePath) {
  const normalized = normalizeRelativePath(relativePath).split(path.sep).join("/");
  const result = spawnSync("git", ["ls-files", "--error-unmatch", normalized], {
    cwd: root,
    encoding: "utf8",
  });

  if (result.error || /not a git repository/i.test(result.stderr || "")) {
    return false;
  }

  return result.status === 0;
}

function assertMissing(relativePath, problems) {
  const absolutePath = path.join(root, relativePath);
  if (fs.existsSync(absolutePath)) {
    problems.push(`Forbidden runtime artifact still exists: ${relativePath}`);
  }
}

function assertNotTracked(relativePath, problems) {
  if (gitTracked(relativePath)) {
    problems.push(`Forbidden file is tracked in git: ${relativePath}`);
  }
}

function checkForbiddenImports(problems) {
  const targets = [
    path.join(root, "server"),
    path.join(root, "public"),
    path.join(root, "ops"),
    path.join(root, "tests"),
  ];
  const importPattern = /(?:archive|external|reference)[\\/]/;

  function walk(currentPath) {
    if (!fs.existsSync(currentPath)) {
      return;
    }

    const stat = fs.statSync(currentPath);
    if (stat.isDirectory()) {
      if (currentPath.includes(`${path.sep}node_modules${path.sep}`)) {
        return;
      }
      fs.readdirSync(currentPath).forEach((entry) => walk(path.join(currentPath, entry)));
      return;
    }

    if (!currentPath.endsWith(".js") && !currentPath.endsWith(".ejs") && !currentPath.endsWith(".md")) {
      return;
    }

    const content = fs.readFileSync(currentPath, "utf8");
    const relative = path.relative(root, currentPath);
    if (
      currentPath.endsWith(".js") &&
      !relative.startsWith(`ops${path.sep}`) &&
      importPattern.test(content)
    ) {
      problems.push(`Live code references archive/reference/external material: ${relative}`);
    }
  }

  targets.forEach(walk);
}

function checkMigrationPrefixes(problems) {
  const migrationsDir = path.join(root, "server", "src", "database", "migrations");
  if (!fs.existsSync(migrationsDir)) {
    return;
  }

  const seen = new Map();
  fs.readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".js"))
    .forEach((name) => {
      const match = name.match(/^(\d+)_/);
      if (!match) {
        return;
      }
      const prefix = match[1];
      const siblings = seen.get(prefix) || [];
      siblings.push(name);
      seen.set(prefix, siblings);
    });

  for (const [prefix, names] of seen.entries()) {
    if (names.length > 1) {
      problems.push(`Duplicate migration prefix ${prefix}: ${names.join(", ")}`);
    }
  }
}

function run() {
  const problems = [];

  forbiddenRuntimePaths.forEach((relativePath) => assertMissing(relativePath, problems));
  [".env", "node_modules", "server/node_modules"].forEach((relativePath) =>
    assertNotTracked(relativePath, problems)
  );
  checkForbiddenImports(problems);
  checkMigrationPrefixes(problems);

  if (problems.length) {
    problems.forEach((problem) => console.error(problem));
    process.exit(1);
  }

  console.log("Repo guard checks passed.");
}

run();
