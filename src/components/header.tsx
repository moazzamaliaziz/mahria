"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, MapPin, Menu, ShoppingBag, X } from "lucide-react";
import { Brand } from "./brand";
import { useShop } from "./shop-provider";
import { LanguageToggle, useLanguage } from "./language-provider";

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const { count, openBag } = useShop();
  const { t } = useLanguage();
  const links = [
    { href: "/menu", label: t("Our Menu", "ہمارا مینو") },
    { href: "/our-story", label: t("Our Story", "ہماری کہانی") },
    { href: "/contact", label: t("Contact", "رابطہ") },
    { href: "/faqs", label: t("FAQs", "عام سوالات") },
  ];
  return (
    <>
      <div className="announcement">
        <span>{t("Good food. Familiar flavours. A little more Mehria.", "اچھا کھانا، مانوس ذائقے۔ کچھ اور مہریہ۔")}</span>
        <Link href="/contact">
          <MapPin size={12} /> {t("G-11 Markaz, Islamabad", "جی الیون مرکز، اسلام آباد")} <ArrowUpRight size={13} />
        </Link>
      </div>
      <header className="site-header" onKeyDown={(event) => {
        if (event.key === "Escape" && mobileOpen) {
          setMobileOpen(false);
          menuButton.current?.focus();
        }
      }}>
        <div className="header-inner">
          <Brand />
          <nav className="desktop-nav" aria-label={t("Main navigation", "مرکزی روابط")}>
            {links.map(({ href, label }) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}>{label}</Link>)}
          </nav>
          <div className="header-actions">
            <LanguageToggle />
            <button
              className="bag-button"
              onClick={() => { setMobileOpen(false); openBag(); }}
              aria-label={t(`Open bag, ${count} items`, `بیگ کھولیں، ${count} اشیا`)}
            >
              <ShoppingBag size={20} />
              <span className="bag-label">{t("Your bag", "آپ کا بیگ")}</span>
              <span className="bag-count">{count}</span>
            </button>
            <Link href="/menu" className="button primary header-order">
              {t("Our Menu", "مینو دیکھیں")} <ArrowUpRight size={17} />
            </Link>
            <button
              className="icon-button mobile-menu-button"
              ref={menuButton}
              aria-label={mobileOpen ? t("Close navigation", "روابط بند کریں") : t("Open navigation", "روابط کھولیں")}
              aria-expanded={mobileOpen}
              aria-controls="mobile-navigation"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <nav
            id="mobile-navigation"
            className="mobile-nav"
            aria-label={t("Mobile navigation", "موبائل روابط")}
          >
            {links.map(({ href, label }) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} onClick={() => setMobileOpen(false)}>{label}<ArrowUpRight size={20} /></Link>)}
          </nav>
        )}
      </header>
    </>
  );
}
