"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Clock3, ExternalLink, MapPin, Phone } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { business } from "@/lib/business";

export default function ContactContent() {
  const { t } = useLanguage();
  return (
    <main id="main-content" className="public-page section-shell">
      <nav className="breadcrumb" aria-label={t("Breadcrumb", "صفحے کا راستہ")}><Link href="/">{t("Home", "مرکزی صفحہ")}</Link><ArrowRight size={12} /><span aria-current="page">{t("Contact", "رابطہ")}</span></nav>
      <header className="public-page-heading">
        <span className="eyebrow">{t("A CALL AWAY. AROUND THE CORNER.", "ایک فون کی دوری، آپ کے قریب۔")}</span>
        <h1>{t("Let's talk", "بات کرتے ہیں")} <em>{t("food.", "کھانے کی۔")}</em></h1>
        <p className="public-lead">{t("Questions about the menu, a pickup or a larger order? Reach the restaurant directly through its published contact details.", "مینو، خود کھانا وصول کرنے یا بڑے آرڈر کے بارے میں سوال ہے؟ شائع شدہ رابطہ معلومات کے ذریعے ریستوران سے براہِ راست بات کریں۔")}</p>
      </header>
      <div className="contact-grid">
        <figure className="contact-photo"><Image src="/images/mehria-storefront.jpg" alt={t("Mehria's yellow storefront in G-11 Markaz, public listing photo from August 2024", "جی الیون مرکز میں مہریہ کی زرد دکان، عوامی فہرست کی اگست 2024 کی تصویر")} fill sizes="(max-width: 760px) 90vw, 48vw" priority /><figcaption>{t("Public listing photo, August 2024", "عوامی فہرست کی تصویر، اگست 2024")}</figcaption></figure>
        <section className="contact-card" aria-labelledby="contact-title">
          <h2 id="contact-title">{t("Mehria, G-11 Markaz", "مہریہ، جی الیون مرکز")}</h2>
          <div className="contact-detail"><Phone size={21} /><div><h3>{t("Call the restaurant", "ریستوران کو فون کریں")}</h3><a className="contact-phone" href={`tel:${business.phone}`}><bdi dir="ltr">{business.displayPhone}</bdi></a><p>{t("Call to confirm availability, portions and larger orders.", "دستیابی، مقدار اور بڑے آرڈر کی تفصیلات فون پر معلوم کریں۔")}</p></div></div>
          <div className="contact-detail"><MapPin size={21} /><div><h3>{t("Find us", "ہم تک پہنچیں")}</h3><address>{t(business.address, "الغفار پلازہ، جی الیون مرکز")}<br />{t(business.city, "اسلام آباد، پاکستان")}</address><p>{t("The exact shop unit differs between listings. Please call for the entrance and collection point.", "مختلف فہرستوں میں دکان نمبر مختلف ہے۔ داخلی راستے اور کھانا وصول کرنے کی جگہ فون پر معلوم کریں۔")}</p></div></div>
          <div className="contact-detail"><Clock3 size={21} /><div><h3>{t("Published hours", "شائع شدہ اوقات")}</h3><p>{t("Daily:", "روزانہ:")} <bdi dir="ltr">{business.hours}</bdi></p><p>{t("11 am until 1 am the following day. Please call to confirm today's or holiday hours; this is not a live opening-status display.", "صبح گیارہ بجے سے اگلے دن رات ایک بجے تک۔ آج یا تعطیلات کے اوقات فون پر تصدیق کر لیں؛ یہاں کھلے یا بند ہونے کی براہِ راست اطلاع نہیں دی جاتی۔")}</p></div></div>
          <div className="contact-actions"><a href={`tel:${business.phone}`} className="button primary">{t("Call Mehria", "مہریہ کو فون کریں")}<Phone size={17} /></a><a href={business.maps} target="_blank" rel="noopener noreferrer" className="button outline">{t("Get directions", "راستہ دیکھیں")}<ArrowUpRight size={18} /></a></div>
        </section>
      </div>
      <div className="contact-notes">
        <section><h2>{t("Prefer Foodpanda?", "فوڈ پانڈا پر آرڈر کرنا ہے؟")}</h2><p>{t("Check the existing listing for platform delivery options, current availability and platform prices. Its terms and prices may differ from direct orders.", "پلیٹ فارم کی ڈیلیوری، موجودہ دستیابی اور قیمتوں کے لیے موجودہ فہرست دیکھیں۔ وہاں کی شرائط اور قیمتیں براہِ راست آرڈر سے مختلف ہو سکتی ہیں۔")}</p><a href={business.foodpanda} target="_blank" rel="noopener noreferrer" className="text-link">{t("Open Foodpanda", "فوڈ پانڈا کھولیں")}<ExternalLink size={16} /></a></section>
        <section><h2>{t("Before you order", "آرڈر سے پہلے")}</h2><p>{t("For allergies or dietary requirements, call before ordering. Ingredients and allergen handling are not verified online. Website orders, when enabled, are cash only: Cash at pickup (COD) or Cash on delivery (COD).", "الرجی یا خاص غذائی ضرورت کے لیے آرڈر سے پہلے فون کریں۔ اجزا اور الرجی سے بچاؤ کے انتظامات کی آن لائن تصدیق نہیں کی گئی۔ ویب سائٹ سے آرڈر فعال ہونے پر صرف نقد ادائیگی ہے: وصولی پر نقد ادائیگی (COD) یا ڈیلیوری پر نقد ادائیگی (COD)۔")}</p><Link href="/faqs" className="text-link">{t("Read the FAQs", "عام سوالات پڑھیں")}<ArrowRight size={17} /></Link></section>
      </div>
      <p className="public-source-note">{t("These are published business details, not independently tested contact channels.", "یہ شائع شدہ کاروباری معلومات ہیں؛ رابطہ ذرائع کی آزادانہ جانچ نہیں کی گئی۔")} <Link href="/about-this-preview">{t("Sources & preview information", "ماخذ اور پیش نظارے کی معلومات")}</Link></p>
    </main>
  );
}
