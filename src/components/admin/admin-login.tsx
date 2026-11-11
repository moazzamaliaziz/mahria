"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ChefHat,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { LanguageToggle, useLanguage } from "../language-provider";
import { adminError, adminRequest } from "@/lib/admin-client";

export function AdminLogin() {
  const { t, isUr } = useLanguage();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      await adminRequest("login", {
        method: "POST",
        data: {
          email: String(data.get("email")),
          password: String(data.get("password")),
        },
      });
      window.location.replace("/admin/orders");
    } catch (caught) {
      setError(adminError(caught, isUr));
      setBusy(false);
    }
  }
  return (
    <main id="main-content" className="admin-login-page">
      <section className="admin-login-brand">
        <Link href="/" className="admin-logo">
          <span>
            <ChefHat size={29} />
          </span>
          <div>
            mehria<small>KITCHEN MANAGER</small>
          </div>
        </Link>
        <div className="login-brand-copy">
          <span>{t("BEHIND EVERY GOOD MEAL", "ہر اچھے کھانے کے پیچھے")}</span>
          <h1>
            {t("A happy kitchen.", "ایک خوشگوار کچن۔")}
            <br />
            <em>{t("A little more control.", "کام پر مکمل نظر۔")}</em>
          </h1>
          <p>
            {t(
              "Your orders, your menu, your daily rhythm. Everything you need, in one thoughtful workspace.",
              "آرڈر، مینو اور روزمرہ کے کام۔ آپ کی ہر ضرورت ایک آسان ڈیش بورڈ میں۔",
            )}
          </p>
          <div className="login-brand-pills">
            <span>
              <ShieldCheck size={15} />
              {t("Secure access", "محفوظ رسائی")}
            </span>
            <span>{t("English + Urdu", "اردو اور انگریزی")}</span>
            <span>{t("COD only", "صرف نقد")}</span>
          </div>
        </div>
        <p className="login-brand-bottom">G-11 MARKAZ · ISLAMABAD</p>
      </section>
      <section className="admin-login-form-side">
        <div className="login-utility">
          <Link href="/">
            <ArrowLeft size={15} />
            {t("Back to website", "ویب سائٹ پر واپس")}
          </Link>
          <LanguageToggle />
        </div>
        <div className="admin-login-card">
          <span className="login-lock">
            <LockKeyhole size={25} />
          </span>
          <span className="admin-kicker">
            {t("STAFF ACCESS", "عملے کی رسائی")}
          </span>
          <h2>{t("Welcome back.", "خوش آمدید۔")}</h2>
          <p>
            {t(
              "Sign in to see what is cooking.",
              "اپنے آرڈر دیکھنے کے لیے سائن اِن کریں۔",
            )}
          </p>
          <form method="post" onSubmit={submit}>
            <label className="admin-field">
              {t("Email address", "ای میل ایڈریس")}
              <input
                name="email"
                type="email"
                autoComplete="username"
                placeholder="you@example.com"
                maxLength={254}
                required
                disabled={busy}
                dir="ltr"
              />
            </label>
            <label className="admin-field">
              {t("Password", "پاس ورڈ")}
              <span className="password-field">
                <input
                  name="password"
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  maxLength={1024}
                  required
                  disabled={busy}
                  dir="ltr"
                />
                <button
                  type="button"
                  aria-label={t(
                    show ? "Hide password" : "Show password",
                    show ? "پاس ورڈ چھپائیں" : "پاس ورڈ دکھائیں",
                  )}
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>
            {error && (
              <p className="admin-alert error" role="alert">
                {error}
              </p>
            )}
            <button
              className="admin-button solid wide"
              type="submit"
              disabled={busy}
            >
              {t(
                busy ? "Signing in..." : "Sign in securely",
                busy ? "سائن اِن ہو رہا ہے" : "محفوظ سائن اِن",
              )}
              <ArrowRight size={18} />
            </button>
          </form>
          <div className="admin-setup-note">
            <strong>{t("First time here?", "پہلی بار آئے ہیں؟")}</strong>
            <p>
              {t(
                "Run the guided setup in the project terminal. It creates your own admin account. There is no default password.",
                "پروجیکٹ کے ٹرمینل میں آسان سیٹ اَپ چلائیں اور اپنا ایڈمن اکاؤنٹ بنائیں۔ کوئی پہلے سے مقرر پاس ورڈ نہیں ہے۔",
              )}
            </p>
            <code dir="ltr">npm run setup</code>
            <p>
              {t(
                "Forgot your password? The server operator can run npm run admin:reset.",
                "پاس ورڈ بھول گئے؟ سرور کا منتظم npm run admin:reset چلا سکتا ہے۔",
              )}
            </p>
            <Link href="/admin/preview">
              {t("Explore the read-only demo", "صرف دیکھنے والا ڈیمو کھولیں")}{" "}
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
        <span className="admin-login-foot">
          <ShieldCheck size={14} />
          {t(
            "Private staff access. Sessions expire after 8 hours.",
            "صرف عملے کے لیے۔ سیشن 8 گھنٹے بعد ختم ہو جاتا ہے۔",
          )}
        </span>
      </section>
    </main>
  );
}
