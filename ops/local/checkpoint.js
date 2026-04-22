"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const childProcess = require("child_process");

const rootDir = path.resolve(__dirname, "..", "..");
const backupRoot = path.join(rootDir, ".local-backups");
const checkpointsRoot = path.join(backupRoot, "checkpoints");
const indexPath = path.join(backupRoot, "index.json");
const historyPath = path.join(backupRoot, "history.log");
const latestPath = path.join(backupRoot, "latest.json");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function safeRunGit(args) {
  try {
    return childProcess.execFileSync("cmd", ["/c", "git", ...args], {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    return null;
  }
}

function readPackedRef(gitDir, refName) {
  const packedRefsPath = path.join(gitDir, "packed-refs");
  if (!fs.existsSync(packedRefsPath)) {
    return null;
  }

  const lines = fs.readFileSync(packedRefsPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.startsWith("#") || line.startsWith("^")) {
      continue;
    }
    const [hash, name] = line.split(" ");
    if (name === refName) {
      return hash || null;
    }
  }

  return null;
}

function readGitMetadata() {
  const gitDir = path.join(rootDir, ".git");
  const headPath = path.join(gitDir, "HEAD");
  if (!fs.existsSync(headPath)) {
    return { branch: null, commit: null };
  }

  const headValue = fs.readFileSync(headPath, "utf8").trim();
  if (!headValue) {
    return { branch: null, commit: null };
  }

  if (!headValue.startsWith("ref:")) {
    return {
      branch: "(detached)",
      commit: headValue.slice(0, 7),
    };
  }

  const refName = headValue.replace(/^ref:\s*/, "").trim();
  const refPath = path.join(gitDir, ...refName.split("/"));
  let commit = null;

  if (fs.existsSync(refPath)) {
    commit = fs.readFileSync(refPath, "utf8").trim() || null;
  } else {
    commit = readPackedRef(gitDir, refName);
  }

  return {
    branch: refName.replace(/^refs\/heads\//, ""),
    commit: commit ? commit.slice(0, 7) : null,
  };
}

function buildTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

function slugify(value) {
  return (value || "checkpoint")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36) || "checkpoint";
}

function fileInfo(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const stats = fs.statSync(filePath);
  return {
    path: path.relative(rootDir, filePath).replace(/\\/g, "/"),
    size: stats.size,
    modifiedAt: stats.mtime.toISOString(),
  };
}

function directorySummary(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return null;
  }

  let fileCount = 0;
  let totalBytes = 0;

  const walk = (currentPath) => {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        walk(absolutePath);
        continue;
      }
      const stats = fs.statSync(absolutePath);
      fileCount += 1;
      totalBytes += stats.size;
    }
  };

  walk(dirPath);

  return {
    path: path.relative(rootDir, dirPath).replace(/\\/g, "/"),
    fileCount,
    totalBytes,
  };
}

function copyIfPresent(sourcePath, targetPath) {
  if (!fs.existsSync(sourcePath)) {
    return false;
  }

  ensureDir(path.dirname(targetPath));
  fs.copyFileSync(sourcePath, targetPath);
  return true;
}

function readJsonArray(jsonPath) {
  if (!fs.existsSync(jsonPath)) {
    return [];
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function appendHistoryLine(entry) {
  const line = [
    `[${entry.createdAt}]`,
    entry.id,
    entry.message,
    entry.branch ? `branch=${entry.branch}` : "branch=none",
    entry.commit ? `commit=${entry.commit}` : "commit=none",
    `status=${entry.workingTreeStatus || "unknown"}`,
  ].join(" | ");

  fs.appendFileSync(historyPath, `${line}\n`, "utf8");
}

function writeTextFile(filePath, value) {
  fs.writeFileSync(filePath, value, "utf8");
}

function main() {
  ensureDir(backupRoot);
  ensureDir(checkpointsRoot);

  const rawArgs = process.argv.slice(2);
  const message = rawArgs.join(" ").trim() || "Manual local checkpoint";
  const timestamp = buildTimestamp();
  const slug = slugify(message);
  const shortHash = crypto
    .createHash("sha1")
    .update(`${timestamp}:${message}`)
    .digest("hex")
    .slice(0, 8);
  const checkpointId = `${timestamp}-${slug}-${shortHash}`;
  const checkpointDir = path.join(checkpointsRoot, checkpointId);
  const snapshotDir = path.join(checkpointDir, "snapshot");

  ensureDir(checkpointDir);
  ensureDir(snapshotDir);

  const gitMeta = readGitMetadata();
  const gitStatus = safeRunGit(["status", "--short"]);
  const trackedFiles = safeRunGit(["ls-files"]);
  const gitDiff = safeRunGit(["diff", "--", ".", ":(exclude).local-backups"]);

  const envPath = path.join(rootDir, ".env");
  const sqlitePath = path.join(rootDir, "reference", "sqlite", "users.db");
  const uploadsPath = path.join(rootDir, "storage", "uploads");

  const envCopied = copyIfPresent(envPath, path.join(snapshotDir, ".env.backup.local"));
  const sqliteCopied = copyIfPresent(sqlitePath, path.join(snapshotDir, "users.db"));

  if (gitStatus) {
    writeTextFile(path.join(checkpointDir, "git-status.txt"), `${gitStatus}\n`);
  } else {
    writeTextFile(path.join(checkpointDir, "git-status.txt"), "Working tree clean.\n");
  }

  if (gitDiff) {
    writeTextFile(path.join(checkpointDir, "git-diff.patch"), `${gitDiff}\n`);
  }

  if (trackedFiles) {
    writeTextFile(path.join(checkpointDir, "tracked-files.txt"), `${trackedFiles}\n`);
  }

  const entry = {
    id: checkpointId,
    message,
    createdAt: new Date().toISOString(),
    branch: gitMeta.branch,
    commit: gitMeta.commit,
    workingTreeStatus: gitStatus === null ? "unknown" : (gitStatus ? "dirty" : "clean"),
    snapshot: {
      envCopied,
      sqliteCopied,
      env: fileInfo(envPath),
      sqlite: fileInfo(sqlitePath),
      uploads: directorySummary(uploadsPath),
    },
  };

  const currentIndex = readJsonArray(indexPath);
  currentIndex.unshift(entry);

  fs.writeFileSync(indexPath, JSON.stringify(currentIndex, null, 2), "utf8");
  fs.writeFileSync(latestPath, JSON.stringify(entry, null, 2), "utf8");
  fs.writeFileSync(path.join(checkpointDir, "meta.json"), JSON.stringify(entry, null, 2), "utf8");
  appendHistoryLine(entry);

  const summary = [
    "Local checkpoint created.",
    `id: ${entry.id}`,
    `message: ${entry.message}`,
    `branch: ${entry.branch || "none"}`,
    `commit: ${entry.commit || "none"}`,
    `status: ${entry.workingTreeStatus}`,
    `path: ${checkpointDir}`,
  ].join("\n");

  process.stdout.write(`${summary}\n`);
}

main();
