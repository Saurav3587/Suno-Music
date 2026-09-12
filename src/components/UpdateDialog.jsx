import React, { useState, useEffect } from "react";
import {
  startAppUpdate,
  installDownloadedApk,
  openInstallSettings,
  canInstallPackages,
  AppUpdate,
} from "../utils/updater";

export default function UpdateDialog({ versionInfo, currentVersion, onSkip }) {
  const [status, setStatus] = useState("idle"); // idle | downloading | installing | needsPermission | done | error
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const { version, releaseNotes, forceUpdate } = versionInfo;

  useEffect(() => {
    let permListener = null;
    if (AppUpdate?.addListener) {
      AppUpdate.addListener("permissionNeeded", () => {
        setStatus("needsPermission");
      })
        .then((l) => {
          permListener = l;
        })
        .catch(() => {});
    }
    return () => {
      if (permListener && permListener.remove) {
        try {
          permListener.remove();
        } catch (_) {}
      }
    };
  }, []);

  // When user returns to the app from Settings, auto-check if permission is now granted
  useEffect(() => {
    const handleFocus = async () => {
      if (status === "needsPermission") {
        const canInstall = await canInstallPackages();
        if (canInstall) {
          handleInstall();
        }
      }
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [status]);

  const handleInstall = async () => {
    setStatus("installing");
    try {
      const res = await installDownloadedApk();
      if (res?.needsPermission) {
        setStatus("needsPermission");
      }
    } catch (err) {
      console.error("Install failed:", err);
      setErrorMsg(err?.message || "Could not launch installer. Tap to retry.");
      setStatus("error");
    }
  };

  const handleUpdate = async () => {
    setStatus("downloading");
    setProgress(0);
    setErrorMsg("");
    try {
      const res = await startAppUpdate(versionInfo, (pct) => {
        setProgress(pct);
      });
      if (res?.needsPermission) {
        setStatus("needsPermission");
      } else {
        setStatus("installing");
      }
    } catch (err) {
      console.error("In-app update failed:", err);
      setErrorMsg(err?.message || "Download failed. Please check your connection and retry.");
      setStatus("error");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999999,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        padding: "0 0 var(--safe-bottom, 24px) 0",
        animation: "fadeIn 0.3s ease",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          background: "linear-gradient(160deg, #12101e 0%, #0e0c1a 100%)",
          borderRadius: "28px 28px 0 0",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 -16px 60px rgba(162, 56, 255, 0.18), 0 -4px 20px rgba(0,0,0,0.6)",
          padding: "28px 24px 36px",
          animation: "slideUp 0.4s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* Handle Bar */}
        <div
          style={{
            width: "40px",
            height: "4px",
            borderRadius: "99px",
            background: "rgba(255,255,255,0.15)",
            margin: "0 auto 24px",
          }}
        />

        {/* Icon + Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #ff2e93 0%, #a238ff 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "26px",
              flexShrink: 0,
              boxShadow: "0 8px 24px rgba(255,46,147,0.35)",
            }}
          >
            🚀
          </div>
          <div>
            <div
              style={{
                fontSize: "0.65rem",
                fontWeight: 700,
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                color: "#a238ff",
                marginBottom: "4px",
              }}
            >
              Update Available
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: "1.3rem",
                fontWeight: 800,
                color: "#fff",
                fontFamily: "var(--font-display, 'Outfit', sans-serif)",
                letterSpacing: "-0.3px",
              }}
            >
              Version {version}
            </h2>
            <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>
              Current: {currentVersion}
            </div>
          </div>
        </div>

        {/* Release Notes */}
        {releaseNotes && (
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "14px",
              padding: "14px 16px",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                letterSpacing: "1px",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.35)",
                marginBottom: "8px",
              }}
            >
              What&apos;s New
            </div>
            <p
              style={{
                margin: 0,
                fontSize: "0.88rem",
                color: "rgba(255,255,255,0.75)",
                lineHeight: 1.6,
              }}
            >
              {releaseNotes}
            </p>
          </div>
        )}

        {/* Progress Bar (shown during download) */}
        {/* Progress Bar (shown during download) */}
        {(status === "downloading" || status === "installing") && (
          <div style={{ marginBottom: "20px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "8px",
              }}
            >
              <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>
                {status === "downloading" ? "Downloading update…" : "Opening Android installer…"}
              </span>
              <span style={{ fontSize: "0.8rem", color: "#a238ff", fontWeight: 700 }}>
                {status === "installing" ? "100%" : `${progress}%`}
              </span>
            </div>
            <div
              style={{
                height: "6px",
                background: "rgba(255,255,255,0.08)",
                borderRadius: "99px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${status === "installing" ? 100 : progress}%`,
                  background: "linear-gradient(90deg, #ff2e93, #a238ff)",
                  borderRadius: "99px",
                  transition: "width 0.3s ease",
                  boxShadow: "0 0 10px rgba(162,56,255,0.5)",
                }}
              />
            </div>
          </div>
        )}

        {/* Permission Required State */}
        {status === "needsPermission" && (
          <div
            style={{
              background: "rgba(255, 179, 0, 0.12)",
              border: "1px solid rgba(255, 179, 0, 0.3)",
              borderRadius: "14px",
              padding: "16px",
              marginBottom: "20px",
            }}
          >
            <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "#ffb300", marginBottom: "6px" }}>
              🔒 Install Permission Required
            </div>
            <p style={{ margin: "0 0 12px", fontSize: "0.83rem", color: "rgba(255,255,255,0.85)", lineHeight: 1.5 }}>
              Android requires permission to install updates from within the app. Tap <strong>Open Settings</strong> below, toggle on <strong>"Allow from this source"</strong>, then return here and tap <strong>Install Now</strong>.
            </p>
          </div>
        )}

        {/* Error State */}
        {status === "error" && (
          <div
            style={{
              background: "rgba(255, 59, 48, 0.12)",
              border: "1px solid rgba(255, 59, 48, 0.25)",
              borderRadius: "12px",
              padding: "12px 16px",
              marginBottom: "20px",
              fontSize: "0.83rem",
              color: "#ff6b6b",
            }}
          >
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {status === "needsPermission" ? (
            <>
              <button
                onClick={() => openInstallSettings()}
                style={{
                  width: "100%",
                  padding: "16px",
                  borderRadius: "16px",
                  border: "none",
                  background: "linear-gradient(135deg, #ffb300 0%, #ff8000 100%)",
                  color: "#000",
                  fontSize: "1rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "0 8px 24px rgba(255,179,0,0.3)",
                  fontFamily: "var(--font-display, 'Outfit', sans-serif)",
                }}
              >
                ⚙️  Open Settings
              </button>
              <button
                onClick={handleInstall}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: "16px",
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: "rgba(255,255,255,0.08)",
                  color: "#fff",
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                📦  Install Now
              </button>
            </>
          ) : (
            <button
              onClick={status === "error" ? handleUpdate : status === "idle" ? handleUpdate : undefined}
              disabled={status === "downloading" || status === "installing" || status === "done"}
              style={{
                width: "100%",
                padding: "16px",
                borderRadius: "16px",
                border: "none",
                background:
                  status === "downloading" || status === "installing"
                    ? "rgba(255,255,255,0.06)"
                    : "linear-gradient(135deg, #ff2e93 0%, #a238ff 100%)",
                color: status === "downloading" || status === "installing" ? "rgba(255,255,255,0.4)" : "#fff",
                fontSize: "1rem",
                fontWeight: 700,
                cursor:
                  status === "downloading" || status === "installing" ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                letterSpacing: "-0.2px",
                boxShadow:
                  status === "idle" || status === "error"
                    ? "0 8px 24px rgba(255,46,147,0.3)"
                    : "none",
                fontFamily: "var(--font-display, 'Outfit', sans-serif)",
              }}
            >
              {status === "idle" && "⬇️  Update Now"}
              {status === "downloading" && "Downloading…"}
              {status === "installing" && "📦 Opening Installer…"}
              {status === "done" && "✅ Ready"}
              {status === "error" && "🔄  Retry Update"}
            </button>
          )}

          {!forceUpdate && status !== "downloading" && status !== "installing" && status !== "done" && (
            <button
              onClick={onSkip}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "16px",
                border: "1px solid rgba(255,255,255,0.08)",
                background: "transparent",
                color: "rgba(255,255,255,0.45)",
                fontSize: "0.9rem",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Later
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
