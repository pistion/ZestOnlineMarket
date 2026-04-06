const fs = require("fs");
const path = require("path");

const { paths } = require("../config/env");
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]);

function ensureDirSync(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function saveBase64ImageToFolder(base64, folderPath, fileNamePrefix = "img") {
  if (!base64 || typeof base64 !== "string" || !base64.startsWith("data:")) {
    return null;
  }

  const [metadata, payload] = base64.split(",");
  if (!payload) {
    return null;
  }

  const mimeMatch = metadata.match(/data:(.*);base64/);
  const mimeType = mimeMatch ? String(mimeMatch[1] || "").trim().toLowerCase() : "image/png";
  if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
    return null;
  }

  let extension = ".png";
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) {
    extension = ".jpg";
  } else if (mimeType.includes("gif")) {
    extension = ".gif";
  } else if (mimeType.includes("webp")) {
    extension = ".webp";
  }

  ensureDirSync(folderPath);
  const fileBuffer = Buffer.from(payload, "base64");
  if (!fileBuffer.length || fileBuffer.length > MAX_UPLOAD_BYTES) {
    return null;
  }

  const fileName = `${fileNamePrefix}_${Date.now()}${extension}`;
  const filePath = path.join(folderPath, fileName);
  fs.writeFileSync(filePath, fileBuffer);

  return `/uploads/${path.relative(paths.uploadsDir, filePath).replace(/\\/g, "/")}`;
}

function deleteUploadedFiles(urls = []) {
  urls.forEach((url) => {
    if (!url || typeof url !== "string" || !url.startsWith("/uploads/")) {
      return;
    }

    const filePath = path.join(paths.uploadsDir, url.replace(/^\/uploads\//, ""));
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (error) {
        // Ignore cleanup failures so the primary request result is preserved.
      }
    }
  });
}

module.exports = {
  deleteUploadedFiles,
  ensureDirSync,
  saveBase64ImageToFolder,
};
