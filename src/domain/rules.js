export function normalizeEmail(raw) {
  if (!raw) return "";
  return String(raw).trim().toLowerCase();
}

export function normalizePhone(raw) {
  if (!raw) return "";
  const trimmed = String(raw).replace(/[\s()\-.]/g, "");
  return trimmed.startsWith("00") ? "+" + trimmed.slice(2) : trimmed;
}

export function isEmailValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export function isPhoneValid(phone) {
  return /^\+?\d{6,15}$/.test(phone);
}

export function makeInviteCode() {
  const part = () => Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, "X");
  return `${part()}-${part()}-${part()}`;
}

export function makePublicIdentifier() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
}

export function formatDateTime(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

export function relativeTime(value) {
  if (!value) return "";
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function displayTaskStatus(status) {
  return String(status || "").replace(/_/g, " ");
}
