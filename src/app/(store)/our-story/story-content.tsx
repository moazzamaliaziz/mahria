"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CookingPot, MapPin } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { business } from "@/lib/business";

export default function StoryContent() {
  const { t } = useLanguage();
  return (
    <main id="main-content" className="public-page section-shell">
      <nav className="breadcrumb" aria-label={t("Breadcrumb", "صفحے کا راستہ")}><Link href="/">{t("Home", "مرکزی صفحہ")}</Link><ArrowRight size={12} /><span aria-current="page">{t("Our story", "ہماری کہانی")}</span></nav>
      <section className="editorial-intro" aria-labelledby="story-title">
        <div>
          <span className="eyebrow"><CookingPot size={17} />{t("THE MEHRIA TABLE", "مہریہ کا دسترخوان")}</span>
          <h1 id="story-title">{t("Familiar food.", "مانوس کھانا۔")}<br /><em>{t("A reason to gather.", "مل بیٹھنے کا بہانہ۔")}</em></h1>
          <p className="public-lead">{t("A plate of pulao needs little introduction. Fragrant rice, chicken, a shami on the side: a familiar combination at the heart of Mehria's published menu.", "پلاؤ کی پلیٹ کسی تعارف کی محتاج نہیں۔ خوشبودار چاول، چکن اور ساتھ شامی کباب: مہریہ کے شائع شدہ مینو کا ایک مانوس امتزاج۔")}</p>
          <Link href="/menu" className="button primary">{t("Find your favourite", "اپنا پسندیدہ چنیں")}<ArrowRight size={18} /></Link>
        </div>
        <figure className="editorial-photo">
          <div><Image src="/images/mehria-table.jpg" alt={t("Pulao, shami kababs, raita and salad in Mehria's published photograph", "مہریہ کی شائع شدہ تصویر میں پلاؤ، شامی کباب، رائتہ اور سلاد")} fill sizes="(max-width: 760px) 90vw, 48vw" priority /></div>
          <figcaption>{t("From the public restaurant listing. Serving presentation may vary.", "ریستوران کی عوامی فہرست سے۔ کھانا پیش کرنے کا انداز مختلف ہو سکتا ہے۔")}</figcaption>
        </figure>
      </section>
      <section className="editorial-notes" aria-labelledby="place-title">
        <div><span className="eyebrow"><MapPin size={16} />{t("G-11 MARKAZ, ISLAMABAD", "جی الیون مرکز، اسلام آباد")}</span><h2 id="place-title">{t("A place for the classics.", "روایتی ذائقوں کی جگہ۔")}</h2></div>
        <div>
          <p>{t("Public business listings place Mehria Murgh Pulao at Al Ghaffar Plaza in G-11 Markaz. Alongside chicken pulao, the published menu includes biryani, shami kababs, raita and zarda. A simple lunch or a shared meal can start with the same favourite.", "عوامی کاروباری فہرستوں کے مطابق مہریہ مرغ پلاؤ، الغفار پلازہ، جی الیون مرکز میں واقع ہے۔ شائع شدہ مینو میں چکن پلاؤ کے ساتھ بریانی، شامی کباب، رائتہ اور زردہ بھی شامل ہیں۔ سادہ دوپہر کا کھانا ہو یا اپنوں کے ساتھ دسترخوان، آغاز اپنے پسندیدہ سے کریں۔")}</p>
          <p>{t("Planning to visit or ordering for a group? Speak to the restaurant about today's availability, portions and collection arrangements. We do not promise preparation times or special packages online.", "آنے کا ارادہ ہے یا کئی افراد کے لیے آرڈر کرنا ہے؟ آج کی دستیابی، مقدار اور وصولی کے انتظامات ریستوران سے پوچھ لیں۔ ہم آن لائن تیاری کے وقت یا خصوصی پیکجوں کی ضمانت نہیں دیتے۔")}</p>
          <a href={`tel:${business.phone}`} className="text-link">{t("Talk to Mehria", "مہریہ سے بات کریں")}<ArrowRight size={17} /></a>
        </div>
      </section>
      <aside className="source-panel">
        <h2>{t("A note on this story", "اس کہانی کے بارے میں")}</h2>
        <p>{t("This is an editorial introduction based on published menu and location information, not a verified account of the business's founding or ownership. This proposed website still requires restaurant approval, including permission to reuse its photographs.", "یہ تعارف شائع شدہ مینو اور مقام کی معلومات پر مبنی ہے، کاروبار کے قیام یا ملکیت کی تصدیق شدہ تاریخ نہیں۔ اس مجوزہ ویب سائٹ اور تصاویر کے دوبارہ استعمال کے لیے ریستوران کی منظوری ابھی درکار ہے۔")}</p>
        <Link href="/about-this-preview" className="text-link">{t("Preview & sources", "پیش نظارہ اور ماخذ")}<ArrowRight size={17} /></Link>
      </aside>
    </main>
  );
}
