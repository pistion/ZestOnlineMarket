function hasText(value) {
  return String(value || "").trim().length > 0;
}

function coerceBooleanFlag(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  return ["1", "true", "t", "yes", "y", "on"].includes(normalized);
}

function deriveBuyerProfileCompleted(row) {
  if (!row) {
    return false;
  }

  const explicitValue =
    row.profileCompleted ??
    row.profile_completed ??
    row.profilecompleted;

  if (explicitValue != null) {
    return coerceBooleanFlag(explicitValue);
  }

  return Boolean(
    hasText(row.full_name || row.fullName) ||
      hasText(row.avatar_url || row.avatarUrl) ||
      hasText(row.cover_url || row.coverUrl) ||
      hasText(row.bio) ||
      hasText(row.phone)
  );
}

function deriveStoreProfileCompleted(row) {
  if (!row) {
    return false;
  }

  const explicitValue =
    row.profileCompleted ??
    row.profile_completed ??
    row.is_setup_complete ??
    row.isSetupComplete;

  if (explicitValue != null) {
    return coerceBooleanFlag(explicitValue);
  }

  return Boolean(hasText(row.store_name || row.storeName) && hasText(row.handle));
}

module.exports = {
  coerceBooleanFlag,
  deriveBuyerProfileCompleted,
  deriveStoreProfileCompleted,
  hasText,
};
