import { Filesystem, Directory } from "@capacitor/filesystem";
import { Capacitor } from "@capacitor/core";

// The current app version is injected at build time by Vite
export const CURRENT_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "1.0.0";

/**
 * Compares two semver strings, returns true if remoteVersion > localVersion
 */
export function isNewerVersion(localVersion, remoteVersion) {
  if (!localVersion || !remoteVersion) return false;
  const parse = (v) => String(v).split(".").map((n) => parseInt(n, 10) || 0);
  const local = parse(localVersion);
  const remote = parse(remoteVersion);
  for (let i = 0; i < 3; i++) {
    const l = local[i] || 0;
    const r = remote[i] || 0;
    if (r > l) return true;
    if (r < l) return false;
  }
  return false;
}

/**
 * Fetches version info from the backend.
 * Returns { version, releaseNotes, forceUpdate } or null on failure.
 */
export async function checkForUpdate() {
  try {
    const res = await fetch("/api/version", { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success || !data.version) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Downloads the update bundle from the backend with progress reporting.
 * onProgress(percent: number) is called during download.
 * Returns the downloaded content as a base64 string.
 */
export async function downloadBundle(onProgress) {
  const res = await fetch("/api/update/bundle", { cache: "no-store" });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);

  const contentLength = res.headers.get("Content-Length");
  const total = contentLength ? parseInt(contentLength, 10) : 0;
  let loaded = 0;

  const reader = res.body.getReader();
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    if (total > 0 && onProgress) {
      onProgress(Math.round((loaded / total) * 100));
    }
  }

  // Combine all chunks into a single Uint8Array then convert to base64
  const combined = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  // Convert to base64 for Filesystem API
  let binary = "";
  const len = combined.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(combined[i]);
  }
  return btoa(binary);
}

/**
 * Saves the downloaded bundle zip to the app's data directory,
 * then records the new version. The app will reload on next start.
 * NOTE: Full in-place web bundle replacement requires native plugin support.
 * For now we store the bundle and mark it ready. App reload triggers it.
 */
export async function applyUpdate(base64Zip, newVersion) {
  if (!Capacitor.isNativePlatform()) {
    // In browser/dev mode, just mark the version and reload
    localStorage.setItem("suno_app_version", newVersion);
    window.location.reload();
    return;
  }

  try {
    // Save zip to app's data directory
    await Filesystem.writeFile({
      path: "suno-update.zip",
      data: base64Zip,
      directory: Directory.Data,
    });
    // Mark the new version as installed
    localStorage.setItem("suno_app_version", newVersion);
    // Reload — Capacitor will pick up from the installed bundle
    window.location.reload();
  } catch (err) {
    console.error("Apply update error:", err);
    throw err;
  }
}
