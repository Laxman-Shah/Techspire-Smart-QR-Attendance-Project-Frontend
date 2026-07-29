const INSTALLATION_KEY = "smart_qr_installation_id";
const FINGERPRINT_KEY = "smart_qr_browser_fingerprint";

function randomString(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function getInstallationId(): string {
  if (typeof window === "undefined") return "server-side-installation-placeholder";
  let id = localStorage.getItem(INSTALLATION_KEY);
  if (!id || id.length < 32) {
    id = randomString(32);
    localStorage.setItem(INSTALLATION_KEY, id);
  }
  return id;
}

export function regenerateInstallationId(): string {
  const id = randomString(32);
  localStorage.setItem(INSTALLATION_KEY, id);
  return id;
}

export function getBrowserFingerprint(): string {
  if (typeof window === "undefined") return "";
  let fp = localStorage.getItem(FINGERPRINT_KEY);
  if (!fp) {
    fp = btoa([navigator.userAgent, navigator.language, screen.width, screen.height, Intl.DateTimeFormat().resolvedOptions().timeZone].join("|"));
    localStorage.setItem(FINGERPRINT_KEY, fp);
  }
  return fp;
}
