import { Capacitor, registerPlugin } from "@capacitor/core";

export const AppUpdate = registerPlugin("AppUpdate");

// The current app version is injected at build time by Vite
export const CURRENT_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "1.0.0";

/**
 * Returns the currently active backend URL
 */
export function getActiveBackendUrl() {
  return (
    localStorage.getItem("suno_custom_backend") ||
    localStorage.getItem("suno_active_backend") ||
    "https://suno-music-x6c4.onrender.com"
  );
}

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
 * Returns { version, releaseNotes, forceUpdate, apkUrl } or null on failure.
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
 * Starts the in-app update process.
 * On Android, downloads APK natively in background with live progress and launches package installer.
 * onProgress(percent: number) is called during download.
 */
export async function startAppUpdate(versionInfo, onProgress) {
  const backend = getActiveBackendUrl();
  const rawApkUrl = versionInfo?.apkUrl || "/api/update/apk";
  const apkDownloadUrl = rawApkUrl.startsWith("http")
    ? rawApkUrl
    : `${backend.replace(/\/+$/, "")}/${rawApkUrl.replace(/^\/+/, "")}`;

  if (Capacitor.isNativePlatform()) {
    let progressListener = null;

    try {
      if (onProgress) {
        progressListener = await AppUpdate.addListener("downloadProgress", (info) => {
          if (typeof info?.progress === "number") {
            onProgress(info.progress);
          }
        });
      }

      const res = await AppUpdate.downloadAndInstall({ url: apkDownloadUrl });
      return res;
    } finally {
      if (progressListener) {
        try { progressListener.remove(); } catch (_) {}
      }
    }
  } else {
    // Browser fallback: direct download
    window.open(apkDownloadUrl, "_blank");
    return true;
  }
}

export async function installDownloadedApk() {
  if (Capacitor.isNativePlatform()) {
    return await AppUpdate.installDownloadedApk();
  }
}

export async function openInstallSettings() {
  if (Capacitor.isNativePlatform()) {
    return await AppUpdate.openInstallPermissionSettings();
  }
}

export async function canInstallPackages() {
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await AppUpdate.canInstallPackages();
      return Boolean(res?.canInstall);
    } catch (_) {
      return false;
    }
  }
  return true;
}

// Backward compatibility stubs
export async function downloadBundle(onProgress) {
  return startAppUpdate({}, onProgress);
}

export async function applyUpdate() {
  return true;
}

