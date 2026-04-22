"use strict";

const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..", "..");
const indexPath = path.join(rootDir, ".local-backups", "index.json");

if (!fs.existsSync(indexPath)) {
  process.stdout.write("No local checkpoints recorded yet.\n");
  process.exit(0);
}

let entries = [];
try {
  const parsed = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  entries = Array.isArray(parsed) ? parsed : [];
} catch (error) {
  process.stdout.write("Checkpoint history could not be read.\n");
  process.exit(1);
}

if (!entries.length) {
  process.stdout.write("No local checkpoints recorded yet.\n");
  process.exit(0);
}

const lines = entries.map((entry, index) => {
  const marker = index === 0 ? "*" : "-";
  const branch = entry.branch || "none";
  const commit = entry.commit || "none";
  const status =
    entry.workingTreeStatus ||
    (typeof entry.workingTreeClean === "boolean"
      ? (entry.workingTreeClean ? "clean" : "dirty")
      : "unknown");
  return `${marker} ${entry.createdAt} | ${entry.id} | ${entry.message} | ${branch} | ${commit} | ${status}`;
});

process.stdout.write(`${lines.join("\n")}\n`);
