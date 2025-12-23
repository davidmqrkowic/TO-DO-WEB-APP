export function initialsFromUser(u) {
  const f = (u?.firstName || "").trim();
  const l = (u?.lastName || "").trim();
  const a = f ? f[0] : "";
  const b = l ? l[0] : "";
  const out = (a + b).toUpperCase();
  return out || "?";
}

export function isValidAvatarUrl(url) {
  return typeof url === "string" && url.trim().length > 0;
}
