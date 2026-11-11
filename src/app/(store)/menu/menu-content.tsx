"use client";

import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";
import { MenuSection } from "@/components/menu-section";
import { useLanguage } from "@/components/language-provider";
import { business } from "@/lib/business";

export default function MenuContent() {
  const { t } = useLanguage();
  return (
    <main id="main-content">
      <div className="menu-page-intro section-shell">
        <nav className="breadcrumb" aria-label={t("Breadcrumb", "صفحے کا راستہ")}>
          <Link href="/">{t("Home", "مرکزی صفحہ")}</Link><ArrowRight size={12} />
          <span aria-current="page">{t("Our menu", "ہمارا مینو")}</span>
        </nav>
        <span className="eyebrow">{t("GOOD TASTE. NO COMPLICATED CHOICES.", "اچھا ذائقہ، آسان انتخاب۔")}</span>
        <h1>{t("Come hungry.", "کھانے پر آئیں۔")}<br /><em>{t("Leave with a favourite.", "اپنا پسندیدہ پائیں۔")}</em></h1>
        <p>{t("From the first fragrant forkful to the last sweet bite.", "پہلے خوشبودار نوالے سے آخری میٹھے ذائقے تک۔")}<br />{t("Find a little something that feels like you.", "اپنی پسند کا کچھ خاص چنیں۔")}</p>
        <div className="menu-quick-links"><Link href="/faqs">{t("Ordering & cash payment", "آرڈر اور نقد ادائیگی")}</Link><span aria-hidden="true">/</span><Link href="/contact">{t("Pickup & directions", "وصولی اور راستہ")}</Link></div>
      </div>
      <MenuSection full />
      <div className="allergy-note section-shell">
        <Phone size={22} />
        <div>
          <strong>{t("Food allergies or something specific in mind?", "کھانے سے الرجی ہے یا کوئی خاص فرمائش؟")}</strong>
          <p>{t("Ingredients and allergen handling are not verified online. Please speak to the restaurant before placing an order.", "اجزا اور الرجی سے بچاؤ کے انتظامات کی آن لائن تصدیق نہیں کی گئی۔ آرڈر سے پہلے ریستوران سے بات کریں۔")}</p>
        </div>
        <a href={`tel:${business.phone}`} className="text-link">{t("Call Mehria", "مہریہ کو فون کریں")} <ArrowRight size={18} /></a>
      </div>
    </main>
  );
}
