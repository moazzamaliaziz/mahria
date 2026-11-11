"use client";

import Link from "next/link";
import { useLanguage } from "@/components/language-provider";

export default function PrivacyContent() {
  const { t } = useLanguage();
  return (
    <main id="main-content" className="document-page section-shell">
      <span className="eyebrow">{t("YOUR DETAILS MATTER", "آپ کی معلومات اہم ہیں")}</span>
      <h1>
        {t("Privacy", "رازداری کی")} <em>{t("information.", "معلومات۔")}</em>
      </h1>
      <p className="document-lead">
        {t("How this website implementation handles information. The restaurant must review and approve a complete privacy policy, retention period and contact process before enabling live ordering.", "یہ ویب سائٹ معلومات کو کس طرح استعمال کرتی ہے۔ آرڈر فعال کرنے سے پہلے ریستوران کو مکمل رازداری پالیسی، معلومات رکھنے کی مدت اور رابطے کے طریقے کا جائزہ لے کر منظوری دینی ہوگی۔")}
      </p>
      <h2>{t("Your browsing and bag", "براؤزنگ اور آپ کا بیگ")}</h2>
      <p>
        {t("The bag is stored in your browser's local storage so it can remain between visits. Only menu item identifiers and quantities are saved there, not your name, phone or address. Remove bag items or clear this site's browser data to delete them. This implementation does not include analytics or advertising trackers.", "بیگ آپ کے براؤزر کی مقامی اسٹوریج میں محفوظ ہوتا ہے تاکہ اگلی بار بھی موجود رہے۔ وہاں صرف مینو کی اشیا کی شناخت اور تعداد محفوظ ہوتی ہے، آپ کا نام، فون یا پتہ نہیں۔ انہیں حذف کرنے کے لیے بیگ سے اشیا نکال دیں یا براؤزر سے اس سائٹ کا ڈیٹا صاف کریں۔ اس ویب سائٹ میں تجزیاتی یا اشتہاری ٹریکر شامل نہیں۔")}
      </p>
      <h2>{t("Language preference", "زبان کی پسند")}</h2>
      <p>{t("A preference cookie remembers whether you choose English or Urdu for up to one year. It contains the language choice only. Changing the language updates it; clearing this site's cookies removes it.", "ایک ترجیحی کوکی آپ کی انگریزی یا اردو کی پسند ایک سال تک یاد رکھتی ہے۔ اس میں صرف زبان کا انتخاب ہوتا ہے۔ زبان بدلنے سے یہ بدل جاتی ہے؛ سائٹ کی کوکیز صاف کرنے سے حذف ہو جاتی ہے۔")}</p>
      <h2>{t("When you submit an order", "آرڈر کی درخواست بھیجنے پر")}</h2>
      <p>
        {t("If direct ordering is enabled, your name, mobile number, requested items, fulfilment choice, notes and any delivery address are sent to the website server and stored in MySQL to process your order. Order references, prices, cash-payment method, status and timestamps are also stored. A keyed hash of your phone number is used for abuse-prevention counters. An order is a request, not a guarantee of restaurant acceptance.", "ویب سائٹ سے آرڈر فعال ہو تو آپ کا نام، موبائل نمبر، مطلوبہ اشیا، وصولی کا طریقہ، ہدایات اور ڈیلیوری کا پتہ سرور کو بھیج کر آرڈر کے لیے MySQL میں محفوظ کیے جاتے ہیں۔ حوالہ نمبر، قیمتیں، نقد ادائیگی کا طریقہ، آرڈر کی کیفیت اور اوقات بھی محفوظ ہوتے ہیں۔ غلط استعمال سے بچاؤ کے لیے فون نمبر کا خفیہ کلید سے بنا ہیش استعمال ہوتا ہے۔ آرڈر ایک درخواست ہے، ریستوران کی قبولیت کی ضمانت نہیں۔")}
      </p>
      <h2>{t("Payment information", "ادائیگی کی معلومات")}</h2>
      <p>
        {t("This website does not collect card numbers or bank details and does not take online payment. Enabled website orders are cash only: Cash at pickup (COD) for collection or Cash on delivery (COD) for available delivery areas.", "یہ ویب سائٹ کارڈ نمبر یا بینک کی معلومات جمع نہیں کرتی اور آن لائن ادائیگی نہیں لیتی۔ فعال ویب سائٹ آرڈر صرف نقد ہیں: خود لینے پر وصولی پر نقد ادائیگی (COD)، اور دستیاب علاقوں میں ڈیلیوری پر نقد ادائیگی (COD)۔")}
      </p>
      <h2>{t("Staff access and offline use", "عملے کی رسائی اور آف لائن استعمال")}</h2>
      <p>{t("The staff area uses authenticated server-side sessions. A session cookie, unavailable to browser JavaScript, keeps authorized staff signed in and is sent securely over HTTPS in production. Security records may be kept for login protection and administrative changes. The optional staff-only installable app offers a generic offline screen; it does not cache orders, customer details or authenticated API responses for offline use. There is no customer installable app or public service worker.", "عملے کے حصے میں سرور پر تصدیق شدہ سیشن استعمال ہوتے ہیں۔ سیشن کوکی، جس تک براؤزر کی جاوا اسکرپٹ کی رسائی نہیں ہوتی، مجاز عملے کو لاگ اِن رکھتی ہے اور لائیو سائٹ پر HTTPS کے ذریعے محفوظ طور پر بھیجی جاتی ہے۔ لاگ اِن کے تحفظ اور انتظامی تبدیلیوں کے حفاظتی ریکارڈ رکھے جا سکتے ہیں۔ صرف عملے کی اختیاری قابلِ تنصیب ایپ عام آف لائن پیغام دکھاتی ہے؛ آرڈرز، صارفین کی تفصیلات یا تصدیق شدہ API جوابات آف لائن استعمال کے لیے کیش نہیں کیے جاتے۔ صارفین کے لیے قابلِ تنصیب ایپ یا عوامی سروس ورکر نہیں ہے۔")}</p>
      <h2>{t("Other websites", "دوسری ویب سائٹس")}</h2>
      <p>
        {t("Google Maps, Facebook and Foodpanda links open external services with their own privacy practices. Personal information is not automatically sent to those platforms by the order form.", "گوگل میپس، فیس بک اور فوڈ پانڈا کے روابط بیرونی خدمات کھولتے ہیں جن کے رازداری کے اپنے اصول ہیں۔ آرڈر فارم ان پلیٹ فارمز کو خودبخود ذاتی معلومات نہیں بھیجتا۔")}
      </p>
      <h2>{t("Before launch", "باقاعدہ آغاز سے پہلے")}</h2>
      <p>
        {t("The operator must establish a retention and deletion schedule, a privacy contact, secure database access and backups. In preview mode, checkout submission is disabled and no order information is saved to the server.", "منتظم کو معلومات رکھنے اور حذف کرنے کا شیڈول، رازداری کے لیے رابطہ، ڈیٹابیس کی محفوظ رسائی اور بیک اَپ کا انتظام کرنا ہوگا۔ پیش نظارے میں آرڈر بھیجنا بند ہے اور آرڈر کی معلومات سرور پر محفوظ نہیں ہوتیں۔")}
      </p>
      <Link href="/" className="button primary">
        {t("Back to Mehria", "واپس مہریہ پر")}
      </Link>
    </main>
  );
}
