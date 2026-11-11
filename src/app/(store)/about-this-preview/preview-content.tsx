"use client";

import Link from "next/link";
import research from "@/content/research.json";
import { useLanguage } from "@/components/language-provider";
const checksUr = [
  "کلائنٹ کی شناخت اور جی الیون برانچ کی تصدیق کریں",
  "برانڈ کے تصور اور تصاویر کے حقوق کی منظوری لیں",
  "فون، دکان نمبر اور اوقات کی تصدیق کریں",
  "ٹیکس سمیت براہِ راست آرڈر کی تمام قیمتیں منظور کریں",
  "MySQL، APP_URL اور RATE_LIMIT_SECRET ترتیب دیں",
  "مینو کے ریکارڈ واضح طور پر منظور کریں",
  "تصدیق کے بعد ہی ڈیلیوری کے علاقے اور فیس مقرر کریں",
  "آرڈر سنبھالنے کے انتظام اور رازداری پالیسی کی منظوری کے بعد ہی آرڈر فعال کریں",
  "HTTPS اور ریورس پراکسی پر درخواستوں کی حد کا استعمال کریں",
  "ڈیٹا رکھنے اور حذف کرنے کی پالیسی طے کریں",
];

export default function PreviewContent() {
  const { t } = useLanguage();
  return (
    <main id="main-content" className="document-page section-shell">
      <span className="eyebrow">{t("A TRANSPARENT START", "واضح معلومات کے ساتھ آغاز")}</span>
      <h1>
        {t("About this", "اس پیش نظارے کے")} <em>{t("preview.", "بارے میں۔")}</em>
      </h1>
      <p className="document-lead">
        {t("A proposed website for Mehria Murgh Pulao, built around publicly available business information. It is not evidence of an official launch or client approval.", "مہریہ مرغ پلاؤ کے لیے ایک مجوزہ ویب سائٹ، جو عوامی کاروباری معلومات پر مبنی ہے۔ یہ باقاعدہ آغاز یا کلائنٹ کی منظوری کا ثبوت نہیں۔")}
      </p>
      <h2>{t("Business information", "کاروباری معلومات")}</h2>
      <p>
        {t("The supplied Google link resolves to a search for Mehria Pulao. The strongest public match is Mehria Murgh Pulao at Al Ghaffar Plaza, G-11 Markaz, Islamabad. The precise unit number differs between listings and is intentionally omitted. Phone and hours are published details, not independently tested.", "فراہم کردہ گوگل لنک مہریہ پلاؤ کی تلاش کھولتا ہے۔ عوامی معلومات میں سب سے مضبوط مطابقت الغفار پلازہ، جی الیون مرکز، اسلام آباد کے مہریہ مرغ پلاؤ سے ہے۔ مختلف فہرستوں میں دکان نمبر مختلف ہے، اس لیے جان بوجھ کر درج نہیں کیا گیا۔ فون اور اوقات شائع شدہ معلومات ہیں، ان کی آزادانہ جانچ نہیں کی گئی۔")}
      </p>
      <h2>{t("Menu and ordering", "مینو اور آرڈر")}</h2>
      <p>
        {t(`Preview menu prices are the undiscounted prices published on the G-11 Foodpanda listing, checked on ${research.checkedAt}. They may differ from in-store and direct-order prices. Temporary discounts are excluded. No new family deals, ratings, testimonials or delivery guarantees have been invented.`, `پیش نظارے کی قیمتیں جی الیون کی فوڈ پانڈا فہرست کی بغیر رعایت قیمتیں ہیں، جنہیں ${research.checkedAt} کو دیکھا گیا۔ دکان اور براہِ راست آرڈر کی قیمتیں مختلف ہو سکتی ہیں۔ عارضی رعایتیں شامل نہیں۔ کوئی نئے فیملی پیکج، ریٹنگ، صارفین کے تبصرے یا ڈیلیوری کی ضمانتیں نہیں گھڑی گئیں۔`)}
      </p>
      <p>
        {t("In preview mode, adding items to the bag does not place an order. Direct checkout stays disabled until a MySQL database, approved menu and ordering configuration are available. An approved menu may remain visible while direct ordering is paused. Existing Foodpanda and phone links lead to the restaurant's published contact channels. Enabled website orders accept cash only, at pickup or on delivery (COD).", "پیش نظارے میں بیگ میں اشیا شامل کرنے سے آرڈر نہیں ہوتا۔ MySQL ڈیٹابیس، منظور شدہ مینو اور آرڈر کی ترتیب دستیاب ہونے تک آرڈر بھیجنا بند رہتا ہے۔ آرڈر بند ہونے پر بھی منظور شدہ مینو نظر آ سکتا ہے۔ فوڈ پانڈا اور فون کے موجودہ روابط ریستوران کے شائع شدہ ذرائع کھولتے ہیں۔ فعال ویب سائٹ آرڈر صرف نقد ہیں، خود وصولی یا ڈیلیوری پر (COD)۔")}
      </p>
      <h2>{t("Photography and branding", "تصاویر اور برانڈ کا ڈیزائن")}</h2>
      <p>
        {t("The wordmark and visual identity are design proposals. Restaurant and menu photographs are local prototype copies from the public listings below. Public access does not establish a reuse licence. The client must authorize these images or supply owned replacements before launch. Photos may show a different serving configuration.", "نام کا طرزِ تحریر اور بصری شناخت مجوزہ ڈیزائن ہیں۔ ریستوران اور مینو کی تصاویر نیچے درج عوامی فہرستوں سے اس نمونے کے لیے مقامی طور پر رکھی گئی ہیں۔ عوامی دستیابی دوبارہ استعمال کا لائسنس نہیں۔ آغاز سے پہلے کلائنٹ ان تصاویر کی اجازت دے یا اپنی ملکیت کی تصاویر فراہم کرے۔ تصویر میں دکھائی گئی مقدار یا پیشکش مختلف ہو سکتی ہے۔")}
      </p>
      <h2>{t("Research sources", "معلومات کے ماخذ")}</h2>
      <ul>
        {research.client.sources.map((source) => (
          <li key={source}>
            <a href={source} target="_blank" rel="noopener noreferrer">
              <bdi dir="ltr">{source}</bdi>
            </a>
          </li>
        ))}
      </ul>
      <h2>{t("Before going live", "باقاعدہ آغاز سے پہلے")}</h2>
      <ul>
        {research.launchChecks.map((check, index) => (
          <li key={check}>{t(check, checksUr[index] ?? check)}</li>
        ))}
      </ul>
      <Link href="/" className="button primary">
        {t("Back to Mehria", "واپس مہریہ پر")}
      </Link>
    </main>
  );
}
