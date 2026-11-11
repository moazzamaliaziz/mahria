"use client";

import { useEffect, useState } from "react";
import {
  Banknote,
  Check,
  LockKeyhole,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Truck,
} from "lucide-react";
import type { StoreSettings } from "@/lib/admin-types";
import { adminError, adminRequest, rupeesToPaisa } from "@/lib/admin-client";
import { useLanguage } from "../language-provider";
import { useAdmin } from "./admin-shell";

export function AdminSettings() {
  const { session } = useAdmin();
  const { t, isUr } = useLanguage();
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const [saving, setSaving] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    adminRequest<{ settings: StoreSettings }>("settings", {
      signal: controller.signal,
    })
      .then((result) => {
        setSettings(result.settings);
        setError("");
      })
      .catch((caught) => {
        if (!controller.signal.aborted) setError(adminError(caught, isUr));
      });
    return () => controller.abort();
  }, [reload, isUr]);
  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings || !session) return;
    const form = new FormData(event.currentTarget);
    const fee = rupeesToPaisa(String(form.get("fee")));
    if (fee === null) {
      setError(
        t(
          "Enter a valid delivery fee in rupees.",
          "ڈیلیوری کی درست فیس روپے میں درج کریں۔",
        ),
      );
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await adminRequest<{ settings: StoreSettings }>(
        "settings",
        {
          method: "PATCH",
          csrfToken: session.csrfToken,
          data: {
            orderingEnabled: form.get("orderingEnabled") === "on",
            deliveryAreas: [
              ...new Set(
                String(form.get("areas"))
                  .split(/\n|,/)
                  .map((area) => area.trim())
                  .filter(Boolean),
              ),
            ],
            deliveryFeePaisa: fee,
            version: settings.version,
          },
        },
      );
      setSettings(result.settings);
      setNotice(
        t(
          "Settings saved. New checkouts use these settings immediately.",
          "ترتیبات محفوظ ہو گئیں۔ نئے آرڈر فوراً یہ ترتیبات استعمال کریں گے۔",
        ),
      );
    } catch (caught) {
      setError(adminError(caught, isUr));
    } finally {
      setSaving(false);
    }
  }
  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    const form = new FormData(event.currentTarget);
    if (form.get("newPassword") !== form.get("confirmPassword")) {
      setPasswordError(
        t("The new passwords do not match.", "نئے پاس ورڈ ایک جیسے نہیں ہیں۔"),
      );
      return;
    }
    setPasswordBusy(true);
    setPasswordError("");
    try {
      await adminRequest("password", {
        method: "POST",
        csrfToken: session.csrfToken,
        data: {
          currentPassword: String(form.get("currentPassword")),
          newPassword: String(form.get("newPassword")),
        },
      });
      window.location.replace("/admin/login?password=changed");
    } catch (caught) {
      setPasswordError(adminError(caught, isUr));
      setPasswordBusy(false);
    }
  }
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="admin-kicker">
            {t("SET THE PACE", "اپنے کام کی رفتار طے کریں")}
          </span>
          <h1>{t("Your store. Your way.", "آپ کا اسٹور، آپ کی مرضی۔")}</h1>
          <p>
            {t(
              "A few clear settings to keep everything running smoothly.",
              "چند آسان ترتیبات سے کام کو رواں رکھیں۔",
            )}
          </p>
        </div>
        <button
          className="admin-button subtle"
          onClick={() => setReload((value) => value + 1)}
          disabled={saving}
        >
          <RefreshCw size={16} />
          {t("Refresh", "تازہ کریں")}
        </button>
      </div>
      {notice && (
        <div className="admin-alert success" role="status">
          <Check size={18} />
          {notice}
        </div>
      )}
      {error && (
        <div className="admin-alert error" role="alert">
          {error}
        </div>
      )}
      <div className="admin-settings-grid">
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <h2>
                <Settings2 size={19} />
                {t("Ordering & delivery", "آرڈر اور ڈیلیوری")}
              </h2>
              <p>
                {t(
                  "Changes apply to new orders, not existing ones.",
                  "تبدیلیاں نئے آرڈر پر لاگو ہوتی ہیں، پرانے پر نہیں۔",
                )}
              </p>
            </div>
          </div>
          {settings ? (
            <form
              key={settings.version}
              className="admin-form settings-form"
              method="post"
              onSubmit={saveSettings}
            >
              <label className="admin-switch-row">
                <div>
                  <strong>
                    {t("Accept new orders", "نئے آرڈر قبول کریں")}
                  </strong>
                  <p>
                    {t(
                      "Pause when the kitchen is closed or too busy. Approved menu items stay visible.",
                      "کچن بند یا زیادہ مصروف ہو تو بند کریں۔ منظور شدہ مینو نظر آتا رہے گا۔",
                    )}
                  </p>
                </div>
                <input
                  type="checkbox"
                  role="switch"
                  aria-label={t("Accept new orders", "نئے آرڈر قبول کریں")}
                  name="orderingEnabled"
                  defaultChecked={settings.orderingEnabled}
                  disabled={saving}
                />
              </label>
              <div className="admin-form-divider" />
              <label className="admin-field">
                {t("Delivery areas", "ڈیلیوری کے علاقے")}
                <textarea
                  name="areas"
                  defaultValue={settings.deliveryAreas.join("\n")}
                  rows={5}
                  maxLength={5000}
                  disabled={saving}
                  placeholder={t(
                    "One verified area on each line",
                    "ہر سطر میں ایک تصدیق شدہ علاقہ",
                  )}
                />
                <small>
                  {t(
                    "One area per line. Leave empty to offer pickup only. Add only areas your team actually serves.",
                    "ہر سطر میں ایک علاقہ۔ صرف پک اَپ کے لیے خالی چھوڑیں۔ صرف وہ علاقے شامل کریں جہاں آپ واقعی ڈیلیوری کرتے ہیں۔",
                  )}
                </small>
              </label>
              <label className="admin-field">
                {t("Delivery fee (PKR)", "ڈیلیوری فیس، روپے میں")}
                <input
                  name="fee"
                  inputMode="decimal"
                  defaultValue={String(settings.deliveryFeePaisa / 100)}
                  pattern="[0-9]+([.][0-9]{1,2})?"
                  required
                  disabled={saving}
                  dir="ltr"
                />
                <small>
                  {t(
                    "One fixed fee for the areas above. Enter 0 for free delivery. Pickup never has a delivery fee.",
                    "اوپر کے علاقوں کے لیے ایک مقررہ فیس۔ مفت ڈیلیوری کے لیے 0 درج کریں۔ پک اَپ پر ڈیلیوری فیس نہیں ہے۔",
                  )}
                </small>
              </label>
              <button
                type="submit"
                className="admin-button solid"
                disabled={saving}
              >
                {saving ? (
                  <RefreshCw size={16} className="spin" />
                ) : (
                  <Check size={16} />
                )}
                {t(
                  saving ? "Saving..." : "Save store settings",
                  saving ? "محفوظ ہو رہا ہے" : "ترتیبات محفوظ کریں",
                )}
              </button>
            </form>
          ) : (
            <div className="admin-empty">
              <RefreshCw size={23} />
              <p>
                {t(
                  "Store settings will appear when the database is available.",
                  "ڈیٹابیس سے رابطے پر ترتیبات ظاہر ہوں گی۔",
                )}
              </p>
            </div>
          )}
        </section>
        <div className="admin-settings-aside">
          <section className="admin-payment-card">
            <span>
              <Banknote size={26} />
            </span>
            <span className="admin-kicker">
              {t("PAYMENT METHOD", "ادائیگی کا طریقہ")}
            </span>
            <h2>{t("Cash. And only cash.", "نقد، صرف نقد۔")}</h2>
            <p>
              {t(
                "Cash on delivery or cash at collection. No card details, payment links, or online payment gateway.",
                "ڈیلیوری یا پک اَپ پر نقد رقم۔ کارڈ، ادائیگی کا لنک یا آن لائن گیٹ وے موجود نہیں۔",
              )}
            </p>
            <div>
              <ShieldCheck size={16} />
              {t(
                "COD is enforced by the server",
                "سرور صرف نقد ادائیگی قبول کرتا ہے",
              )}
            </div>
          </section>
          <div className="admin-plain-note">
            <Truck size={21} />
            <strong>{t("A useful reminder", "ایک ضروری یاد دہانی")}</strong>
            <p>
              {t(
                "Confirm addresses and preparation times with customers. The website does not promise delivery times or automatically dispatch riders.",
                "گاہک سے پتہ اور تیاری کا وقت تصدیق کریں۔ ویب سائٹ ڈیلیوری کے وقت کا وعدہ یا رائڈر خود روانہ نہیں کرتی۔",
              )}
            </p>
          </div>
        </div>
      </div>
      <section className="admin-panel admin-security-panel">
        <div className="admin-panel-heading">
          <div>
            <h2>
              <LockKeyhole size={19} />
              {t("Keep your account secure", "اپنا اکاؤنٹ محفوظ رکھیں")}
            </h2>
            <p>
              {t(
                "Changing your password signs out all your devices. Use a unique password of at least 12 characters.",
                "پاس ورڈ بدلنے پر آپ کے تمام آلات سائن آؤٹ ہو جائیں گے۔ کم از کم 12 حروف کا منفرد پاس ورڈ استعمال کریں۔",
              )}
            </p>
          </div>
        </div>
        <form method="post" className="admin-form" onSubmit={changePassword}>
          <div className="admin-password-grid">
            <label className="admin-field">
              {t("Current password", "موجودہ پاس ورڈ")}
              <input
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                disabled={passwordBusy}
                maxLength={1024}
                dir="ltr"
              />
            </label>
            <label className="admin-field">
              {t("New password", "نیا پاس ورڈ")}
              <input
                name="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={1024}
                required
                disabled={passwordBusy}
                dir="ltr"
              />
            </label>
            <label className="admin-field">
              {t("Repeat new password", "نیا پاس ورڈ دوبارہ لکھیں")}
              <input
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={1024}
                required
                disabled={passwordBusy}
                dir="ltr"
              />
            </label>
          </div>
          {passwordError && (
            <p className="admin-alert error" role="alert">
              {passwordError}
            </p>
          )}
          <button
            type="submit"
            className="admin-button subtle"
            disabled={passwordBusy}
          >
            <LockKeyhole size={15} />
            {t(
              passwordBusy
                ? "Updating password..."
                : "Update password & sign out",
              passwordBusy
                ? "پاس ورڈ بدل رہا ہے"
                : "پاس ورڈ بدلیں اور سائن آؤٹ کریں",
            )}
          </button>
        </form>
      </section>
    </>
  );
}
