"use client";

import Link from "next/link";
import { ArrowUpRight, Facebook, Phone } from "lucide-react";
import { Brand } from "./brand";
import { business } from "@/lib/business";
import { useLanguage } from "./language-provider";

export function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="site-footer">
      <div className="footer-main section-shell">
        <div className="footer-brand">
          <Brand light />
          <p>
            {t("Familiar flavours.", "مانوس ذائقے۔")}
            <br />
            {t("Food worth coming together for.", "مل بیٹھ کر کھانے کا لطف۔")}
          </p>
          <a
            className="social-link"
            href={business.facebook}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("Mehria's publicly listed Facebook page", "مہریہ کا عوامی فیس بک صفحہ")}
          >
            <Facebook size={18} />
          </a>
        </div>
        <div className="footer-column">
          <h3>{t("Pull up a chair", "آئیے، مل بیٹھیں")}</h3>
          <Link href="/menu">
            {t("Our menu", "ہمارا مینو")} <ArrowUpRight size={13} />
          </Link>
          <Link href="/our-story">{t("Our story", "ہماری کہانی")}</Link>
          <Link href="/contact">{t("Find us in Islamabad", "اسلام آباد میں ہم سے ملیں")}</Link>
          <Link href="/faqs">{t("Frequently asked questions", "عام سوالات")}</Link>
          <a
            href={business.foodpanda}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("Order on Foodpanda", "فوڈ پانڈا پر آرڈر کریں")} <ArrowUpRight size={13} />
          </a>
        </div>
        <div className="footer-column">
          <h3>{t("Come hungry", "کھانے پر تشریف لائیں")}</h3>
          <p>
            {t(business.address, "الغفار پلازہ، جی الیون مرکز")}
            <br />
            {t(business.city, "اسلام آباد، پاکستان")}
          </p>
          <p>
            {t("Daily,", "روزانہ،")} <bdi dir="ltr">{business.hours}</bdi>
            <br />
            <span className="footer-muted">
              {t("Published hours. Call to confirm.", "یہ شائع شدہ اوقات ہیں۔ فون پر تصدیق کر لیں۔")}
            </span>
          </p>
        </div>
        <div className="footer-contact">
          <span className="eyebrow">{t("LET'S TALK FOOD", "کھانے کی بات ہو جائے")}</span>
          <a href={`tel:${business.phone}`}>
            <Phone size={19} /> <bdi dir="ltr">{business.displayPhone}</bdi>
          </a>
          <p>
            {t("Questions about the menu or a larger order?", "مینو یا بڑے آرڈر کے بارے میں پوچھنا ہے؟")}
            <br />
            {t("Give the restaurant a call.", "ریستوران کو فون کریں۔")}
          </p>
        </div>
      </div>
      <div className="footer-bottom section-shell">
        <span>&copy; {new Date().getFullYear()} {t("Mehria Murgh Pulao.", "مہریہ مرغ پلاؤ۔")}</span>
        <span className="footer-made">
          {t("A taste of Islamabad. A feeling of home.", "اسلام آباد کا ذائقہ، گھر جیسا احساس۔")}
        </span>
        <div>
          <Link href="/privacy">{t("Privacy", "رازداری")}</Link>
          <Link href="/about-this-preview">{t("Preview & sources", "پیش نظارہ اور ماخذ")}</Link>
          <Link href="/admin/login" className="staff-link">{t("Staff login", "عملے کا لاگ اِن")}</Link>
        </div>
      </div>
    </footer>
  );
}
