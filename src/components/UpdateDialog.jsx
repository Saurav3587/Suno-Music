import React, { useState, useEffect } from "react";
import { downloadBundle, applyUpdate } from "../utils/updater";

export default function UpdateDialog({ versionInfo, currentVersion, onSkip }) {
  const [status, setStatus] = useState("idle"); // idle | downloading | applying | done | error
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const { version, releaseNotes, forceUpdate } = versionInfo;

  const handleUpdate = async () => {
    setStatus("downloading");
    setProgress(0);
    try {
      const base64Zip = await downloadBundle((pct) => setProgress(pct));
      setStatus("applying");
      await applyUpdate(base64Zip, version);
      setStatus("done");
    } catch (err) {
      console.error("Update failed:", err);
      setErrorMsg(err?.message || "Update failed. Please try again.");
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
        {(status === "downloading" || status === "applying") && (
          <div style={{ marginBottom: "20px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "8px",
              }}
            >
              <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>
                {status === "downloading" ? "Downloading update…" : "Applying update…"}
              </span>
              <span style={{ fontSize: "0.8rem", color: "#a238ff", fontWeight: 700 }}>
                {status === "applying" ? "100%" : `${progress}%`}
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
                  width: `${status === "applying" ? 100 : progress}%`,
                  background: "linear-gradient(90deg, #ff2e93, #a238ff)",
                  borderRadius: "99px",
                  transition: "width 0.3s ease",
                  boxShadow: "0 0 10px rgba(162,56,255,0.5)",
                }}
              />
            </div>
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
          <button
            onClick={status === "error" ? handleUpdate : status === "idle" ? handleUpdate : undefined}
            disabled={status === "downloading" || status === "applying" || status === "done"}
            style={{
              width: "100%",
              padding: "16px",
              borderRadius: "16px",
              border: "none",
              background:
                status === "downloading" || status === "applying"
                  ? "rgba(255,255,255,0.06)"
                  : "linear-gradient(135deg, #ff2e93 0%, #a238ff 100%)",
              color: status === "downloading" || status === "applying" ? "rgba(255,255,255,0.4)" : "#fff",
              fontSize: "1rem",
              fontWeight: 700,
              cursor:
                status === "downloading" || status === "applying" ? "not-allowed" : "pointer",
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
            {status === "applying" && "Applying Update…"}
            {status === "done" && "✅ Restarting…"}
            {status === "error" && "🔄  Retry Update"}
          </button>

          {!forceUpdate && status !== "downloading" && status !== "applying" && status !== "done" && (
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
