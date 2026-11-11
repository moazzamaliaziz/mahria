"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  BookOpen,
  ChefHat,
  CircleHelp,
  ClipboardList,
  LogOut,
  Menu,
  Settings2,
  ShieldCheck,
  UtensilsCrossed,
  X,
} from "lucide-react";
import type { AdminSessionData } from "@/lib/admin-types";
import { adminError, adminRequest } from "@/lib/admin-client";
import { LanguageToggle, useLanguage } from "@/components/language-provider";

const AdminContext = createContext<{
  session: AdminSessionData | null;
  demo: boolean;
}>({ session: null, demo: false });
export function useAdmin() {
  return useContext(AdminContext);
}

export function AdminShell({
  session = null,
  demo = false,
  children,
}: {
  session?: AdminSessionData | null;
  demo?: boolean;
  children: ReactNode;
}) {
  const { t, isUr } = useLanguage();
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const [error, setError] = useState("");
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", onShow);
    if (!session) return () => window.removeEventListener("pageshow", onShow);
    const timer = window.setTimeout(
      () => window.location.replace("/admin/login?expired=1"),
      Math.max(0, new Date(session.expiresAt).getTime() - Date.now()),
    );
    return () => {
      window.removeEventListener("pageshow", onShow);
      clearTimeout(timer);
    };
  }, [session]);

  async function logout() {
    if (!session) return;
    setLeaving(true);
    setError("");
    try {
      await adminRequest("logout", {
        method: "POST",
        csrfToken: session.csrfToken,
      });
      window.location.replace("/admin/login");
    } catch (caught) {
      setError(adminError(caught, isUr));
      setLeaving(false);
    }
  }

  const links = [
    { href: "/admin/orders", title: t("Orders", "آرڈر"), icon: ClipboardList },
    {
      href: "/admin/menu",
      title: t("Menu manager", "مینو مینیجر"),
      icon: UtensilsCrossed,
    },
    {
      href: "/admin/settings",
      title: t("Store settings", "اسٹور کی ترتیبات"),
      icon: Settings2,
    },
    {
      href: "/admin/help",
      title: t("Getting started", "استعمال کا طریقہ"),
      icon: CircleHelp,
    },
  ];

  return (
    <AdminContext value={{ session, demo }}>
      <div className="admin-shell">
        <aside
          className={`admin-sidebar ${navOpen ? "is-open" : ""}`}
          aria-label={t("Admin navigation", "ایڈمن نیویگیشن")}
        >
          <Link
            className="admin-logo"
            href={demo ? "/admin/preview" : "/admin/orders"}
          >
            <span>
              <ChefHat size={26} />
            </span>
            <div>
              mehria<small>KITCHEN MANAGER</small>
            </div>
          </Link>
          <button
            className="admin-nav-close"
            onClick={() => setNavOpen(false)}
            aria-label={t("Close navigation", "مینو بند کریں")}
          >
            <X size={20} />
          </button>
          <div className="admin-store-tag">
            <span className="admin-store-dot" />
            <span>
              G-11 Markaz
              <small>{t("Islamabad, Pakistan", "اسلام آباد، پاکستان")}</small>
            </span>
          </div>
          <span className="admin-nav-caption">
            {t("YOUR WORKSPACE", "آپ کا ڈیش بورڈ")}
          </span>
          <nav>
            {links.map(({ href, title, icon: Icon }, index) => (
              <Link
                key={href}
                href={
                  demo
                    ? index === 0
                      ? "/admin/preview"
                      : "/admin/login"
                    : href
                }
                className={
                  pathname === href || (demo && index === 0) ? "active" : ""
                }
                aria-current={
                  pathname === href || (demo && index === 0)
                    ? "page"
                    : undefined
                }
                onClick={() => setNavOpen(false)}
              >
                <Icon size={19} />
                {title}
                {index === 0 && (
                  <span className="nav-live">{t("LIVE", "لائیو")}</span>
                )}
              </Link>
            ))}
          </nav>
          <div className="admin-sidebar-note">
            <ShieldCheck size={22} />
            <strong>
              {t("Simple. Secure. Cash only.", "آسان، محفوظ، صرف نقد")}
            </strong>
            <p>
              {t(
                "A calmer way to run a busy kitchen.",
                "مصروف کچن کو آسانی سے سنبھالیں۔",
              )}
            </p>
          </div>
          <div className="admin-sidebar-bottom">
            <Link href="/" target="_blank" rel="noopener noreferrer">
              <ArrowUpRight size={18} />
              {t("Open the website", "ویب سائٹ کھولیں")}
            </Link>
            {!demo && (
              <button disabled={leaving} onClick={logout}>
                <LogOut size={18} />
                {t(
                  leaving ? "Signing out..." : "Sign out",
                  leaving ? "سائن آؤٹ ہو رہا ہے" : "سائن آؤٹ",
                )}
              </button>
            )}
          </div>
        </aside>
        {navOpen && (
          <button
            className="admin-nav-backdrop"
            aria-label={t("Close navigation", "مینو بند کریں")}
            onClick={() => setNavOpen(false)}
          />
        )}
        <div className="admin-workspace">
          <header className="admin-topbar">
            <div className="admin-topbar-left">
              <button
                className="admin-nav-toggle"
                onClick={() => setNavOpen(!navOpen)}
                aria-label={t("Open admin navigation", "ایڈمن مینو کھولیں")}
                aria-expanded={navOpen}
              >
                <Menu size={22} />
              </button>
              <span>{t("Kitchen manager", "کچن مینیجر")}</span>
              <span className="topbar-divider">/</span>
              <strong>
                {demo
                  ? t("Preview", "پیش منظر")
                  : (links.find((link) => link.href === pathname)?.title ??
                    t("Workspace", "ڈیش بورڈ"))}
              </strong>
            </div>
            <div className="admin-topbar-right">
              <LanguageToggle />
              <span className="admin-avatar" aria-hidden="true">
                {(session?.admin.name ?? "M").slice(0, 1).toUpperCase()}
              </span>
              <div className="admin-person">
                <strong>
                  {session?.admin.name ?? t("Preview mode", "پیش منظر")}
                </strong>
                <small>{t("Store administrator", "اسٹور ایڈمن")}</small>
              </div>
            </div>
          </header>
          {error && (
            <div className="admin-alert error" role="alert">
              {error}
            </div>
          )}
          {demo && (
            <div className="admin-demo-banner">
              <BookOpen size={18} />
              <span>
                {t(
                  "Read-only demo. These are sample orders, not real customers or sales.",
                  "صرف دیکھنے کا ڈیمو۔ یہ نمونہ آرڈر ہیں، اصل گاہک یا فروخت نہیں۔",
                )}
              </span>
              <Link href="/admin/login">
                {t("Set up your store", "اپنا اسٹور سیٹ اَپ کریں")}{" "}
                <ArrowUpRight size={15} />
              </Link>
            </div>
          )}
          <main id="main-content" className="admin-main">
            {children}
          </main>
          <footer className="admin-page-footer">
            <span>Mehria Kitchen Manager</span>
            <span>
              <ShieldCheck size={12} />
              {t(
                "Cash on delivery only. No online payments.",
                "صرف نقد ادائیگی۔ کوئی آن لائن ادائیگی نہیں۔",
              )}
            </span>
          </footer>
        </div>
      </div>
    </AdminContext>
  );
}
