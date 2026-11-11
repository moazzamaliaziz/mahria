"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, WifiOff } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function subscribeConnection(listener: () => void) {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
}

function subscribeDisplayMode(listener: () => void) {
  const query = window.matchMedia("(display-mode: standalone)");
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

function getDisplayMode() {
  if (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone
  )
    return "standalone";
  return window.isSecureContext && "serviceWorker" in navigator
    ? "browser"
    : "unsupported";
}

export function AdminPwa() {
  const { t } = useLanguage();
  const online = useSyncExternalStore(
    subscribeConnection,
    () => navigator.onLine,
    () => true,
  );
  const displayMode = useSyncExternalStore(
    subscribeDisplayMode,
    getDisplayMode,
    () => "pending",
  );
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(
    null,
  );
  const [installed, setInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installFailed, setInstallFailed] = useState(false);
  const [registration, setRegistration] = useState<
    "pending" | "ready" | "failed"
  >("pending");

  useEffect(() => {
    if (
      !window.location.pathname.startsWith("/admin/") ||
      !window.isSecureContext ||
      !("serviceWorker" in navigator)
    )
      return;
    let active = true;
    function onInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as InstallPrompt);
      setInstallFailed(false);
    }
    function onInstalled() {
      setInstalled(true);
      setInstallPrompt(null);
    }
    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    navigator.serviceWorker
      .register("/admin/sw.js", { scope: "/admin/", updateViaCache: "none" })
      .then(() => {
        if (active) setRegistration("ready");
      })
      .catch(() => {
        if (active) setRegistration("failed");
      });
    return () => {
      active = false;
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!installPrompt || installing) return;
    setInstalling(true);
    setInstallFailed(false);
    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      // Acceptance is not installation; only appinstalled or standalone confirms it.
    } catch {
      setInstallFailed(true);
    } finally {
      setInstallPrompt(null);
      setInstalling(false);
    }
  }

  const showInstall =
    !installed && displayMode !== "standalone" && displayMode !== "pending";
  return (
    <div className="admin-pwa">
      <div
        className="admin-pwa-connection"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {!online && (
          <p className="admin-pwa-offline">
            <WifiOff size={16} aria-hidden="true" />
            <span>
              {t(
                "Disconnected. You cannot receive or process orders offline. Nothing is queued. Reconnect and refresh orders.",
                "انٹرنیٹ منقطع ہے۔ آف لائن آرڈر وصول یا پراسیس نہیں ہو سکتے۔ کوئی آرڈر قطار میں محفوظ نہیں ہوتا۔ انٹرنیٹ بحال کر کے آرڈرز تازہ کریں۔",
              )}
            </span>
          </p>
        )}
      </div>
      {showInstall && (
        <div className="admin-pwa-install">
          {registration === "ready" && installPrompt && online ? (
            <button
              className="admin-install-button"
              type="button"
              onClick={install}
              disabled={installing}
            >
              <Download size={16} aria-hidden="true" />
              {installing
                ? t("Opening installer...", "انسٹالیشن کھل رہی ہے...")
                : t("Install app", "ایپ انسٹال کریں")}
            </button>
          ) : (
            <a
              className="admin-install-button admin-install-help"
              href="/admin/help"
            >
              {t("App installation help", "ایپ انسٹال کرنے کی رہنمائی")}
            </a>
          )}
          <p className="admin-pwa-note" role="status">
            {registration === "failed"
              ? t(
                  "App setup failed. You can still use the dashboard online; reload to retry.",
                  "ایپ سیٹ اپ ناکام ہوا۔ ڈیش بورڈ آن لائن استعمال کریں؛ دوبارہ کوشش کے لیے صفحہ ری لوڈ کریں۔",
                )
              : displayMode === "unsupported"
                ? t(
                    "Installation is unavailable here. Use a supported browser over HTTPS.",
                    "یہاں انسٹالیشن دستیاب نہیں۔ HTTPS پر معاون براؤزر استعمال کریں۔",
                  )
                : installFailed
                  ? t(
                      "The install prompt could not open. See installation help.",
                      "انسٹالیشن کا پیغام نہیں کھل سکا۔ رہنمائی دیکھیں۔",
                    )
                  : t(
                      "iPhone / iPad: in Safari, use Share, then Add to Home Screen. Orders always need internet.",
                      "آئی فون / آئی پیڈ: سفاری میں شیئر، پھر ہوم اسکرین میں شامل کریں۔ آرڈرز کے لیے انٹرنیٹ ہمیشہ ضروری ہے۔",
                    )}
          </p>
        </div>
      )}
      <style jsx>{`
        .admin-pwa {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          min-width: 0;
        }
        .admin-pwa-connection:empty {
          display: none;
        }
        .admin-pwa-offline {
          display: flex;
          align-items: flex-start;
          gap: 0.55rem;
          margin: 0;
          border: 1px solid #d8a07c;
          border-radius: 0.7rem;
          padding: 0.7rem 0.8rem;
          background: #fff0df;
          color: #742c1d;
          font-size: 0.8rem;
          line-height: 1.65;
        }
        .admin-pwa-offline :global(svg) {
          flex: 0 0 auto;
          margin-top: 0.2rem;
        }
        .admin-pwa-install {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.45rem;
        }
        .admin-install-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          min-height: 44px;
          max-width: 100%;
          padding: 0.65rem 0.9rem;
          border: 1px solid #a92526;
          border-radius: 0.65rem;
          background: #a92526;
          color: #fffdf7;
          font: inherit;
          font-size: 0.82rem;
          font-weight: 700;
          line-height: 1.5;
          text-align: start;
          text-decoration: none;
          cursor: pointer;
        }
        .admin-install-button:hover {
          background: #812021;
          border-color: #812021;
        }
        .admin-install-button:focus-visible {
          outline: 3px solid #a92526;
          outline-offset: 3px;
        }
        .admin-install-button:disabled {
          opacity: 0.65;
          cursor: wait;
        }
        .admin-install-help {
          background: #fbf7ed;
          color: #812021;
          border-color: #d9c7b6;
        }
        .admin-install-help:hover {
          background: #f2e7d7;
          color: #812021;
        }
        .admin-pwa-note {
          max-width: 36rem;
          margin: 0;
          color: #6a5649;
          font-size: 0.75rem;
          line-height: 1.75;
          overflow-wrap: anywhere;
        }
      `}</style>
    </div>
  );
}
