"use client";

import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  ClipboardList,
  Download,
  LockKeyhole,
  ShieldCheck,
  Smartphone,
  Wifi,
} from "lucide-react";
import { useLanguage } from "../language-provider";

export function AdminHelp() {
  const { t } = useLanguage();
  const steps = [
    [
      t("Make the menu yours", "مینو چیک کریں"),
      t(
        "Check names, translations, serving sizes and final rupee prices. Approve only the verified items and mark them available.",
        "نام، ترجمہ، مقدار اور روپے میں حتمی قیمت چیک کریں۔ صرف تصدیق شدہ اشیا منظور اور دستیاب کریں۔",
      ),
      "/admin/menu",
    ],
    [
      t("Open your kitchen", "کچن کے آرڈر فعال کریں"),
      t(
        "Add delivery areas and the fee, or leave areas empty for pickup. Switch on Accept new orders in Store settings.",
        "ڈیلیوری کے علاقے اور فیس درج کریں، یا صرف پک اَپ کے لیے علاقے خالی چھوڑیں۔ ترتیبات میں نئے آرڈر فعال کریں۔",
      ),
      "/admin/settings",
    ],
    [
      t("Follow each order", "ہر آرڈر کا کام مکمل کریں"),
      t(
        "Confirm a new order, start preparing, then mark it ready. Send delivery orders out before completing them.",
        "نئے آرڈر کی تصدیق کریں، تیاری شروع کریں، پھر تیار ہونے کا نشان لگائیں۔ ڈیلیوری آرڈر مکمل کرنے سے پہلے روانہ کریں۔",
      ),
      "/admin/orders",
    ],
    [
      t("Collect cash, then complete", "نقد وصول کرکے مکمل کریں"),
      t(
        "Check the total and confirm that the full cash amount was received. Only then mark the order completed.",
        "کل رقم چیک کریں اور پوری نقد رقم وصول ہونے کی تصدیق کریں۔ اس کے بعد ہی آرڈر مکمل کریں۔",
      ),
      "/admin/orders",
    ],
  ];
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="admin-kicker">
            {t(
              "A LITTLE HELP GOES A LONG WAY",
              "کام آسان بنانے کے لیے رہنمائی",
            )}
          </span>
          <h1>{t("You have got this.", "آپ آسانی سے کر سکتے ہیں۔")}</h1>
          <p>
            {t(
              "Four small steps. A kitchen that runs a little smoother.",
              "چار آسان قدم۔ کچن کا کام پہلے سے زیادہ آسان۔",
            )}
          </p>
        </div>
      </div>
      <div className="admin-help-steps">
        {steps.map(([title, text, href], index) => (
          <article key={title}>
            <span className="help-step-number">0{index + 1}</span>
            <h2>{title}</h2>
            <p>{text}</p>
            <Link href={href}>
              {t("Go there", "کھولیں")}
              <ArrowRight size={16} />
            </Link>
          </article>
        ))}
      </div>
      <section className="admin-panel admin-help-install">
        <div>
          <span className="help-install-icon">
            <Smartphone size={34} />
          </span>
          <span className="admin-kicker">
            {t("YOUR KITCHEN, IN YOUR POCKET", "آپ کا کچن، آپ کی جیب میں")}
          </span>
          <h2>{t("Install the admin app.", "ایڈمن ایپ انسٹال کریں۔")}</h2>
          <p>
            {t(
              "Only the staff dashboard is an installable app. The customer website stays a regular website.",
              "صرف عملے کا ڈیش بورڈ انسٹال ہونے والی ایپ ہے۔ گاہک کی ویب سائٹ عام ویب سائٹ رہے گی۔",
            )}
          </p>
        </div>
        <div className="help-install-instructions">
          <h3>
            <Download size={17} />
            {t("Android / Chrome / Edge", "اینڈرائیڈ، کروم، ایج")}
          </h3>
          <p>
            {t(
              "Open the admin dashboard over HTTPS (or localhost for testing). Use Install app when it appears, or choose Install app / Add to Home screen from the browser menu.",
              "ایڈمن ڈیش بورڈ HTTPS پر کھولیں، یا ٹیسٹ کے لیے localhost استعمال کریں۔ انسٹال ایپ کے بٹن یا براؤزر مینو سے Install app یا Add to Home screen منتخب کریں۔",
            )}
          </p>
          <h3>
            <Smartphone size={17} />
            {t("iPhone / iPad", "آئی فون یا آئی پیڈ")}
          </h3>
          <p>
            {t(
              "Open /admin/orders in Safari. Tap Share, then Add to Home Screen. Launch it from your home screen and sign in.",
              "سفاری میں /admin/orders کھولیں۔ Share، پھر Add to Home Screen دبائیں۔ ہوم اسکرین سے کھول کر سائن اِن کریں۔",
            )}
          </p>
        </div>
      </section>
      <div className="admin-help-grid">
        <article>
          <Wifi size={23} />
          <h3>
            {t(
              "Stay online to receive orders",
              "آرڈر وصول کرنے کے لیے آن لائن رہیں",
            )}
          </h3>
          <p>
            {t(
              "Orders refresh every 15 seconds while this screen is visible. Offline mode only shows a generic reconnect screen. It cannot accept, store or process orders.",
              "اسکرین کھلی ہونے پر ہر 15 سیکنڈ بعد آرڈر تازہ ہوتے ہیں۔ آف لائن حالت میں صرف رابطہ بحال کرنے کی اسکرین آتی ہے، آرڈر محفوظ یا مکمل نہیں ہوتے۔",
            )}
          </p>
        </article>
        <article>
          <ClipboardList size={23} />
          <h3>
            {t("Keep a staffed device open", "عملے کا ایک آلہ کھلا رکھیں")}
          </h3>
          <p>
            {t(
              "Enable sound with the button on the order board. Sound needs browser permission to play. There are no background push alerts when the app is closed or suspended.",
              "آرڈر بورڈ سے آواز فعال کریں۔ آواز کے لیے براؤزر کی اجازت ضروری ہے۔ بند یا سلیپ ایپ میں پش الرٹ نہیں آتے۔",
            )}
          </p>
        </article>
        <article>
          <LockKeyhole size={23} />
          <h3>{t("Your account is private", "آپ کا اکاؤنٹ محفوظ ہے")}</h3>
          <p>
            {t(
              "Use your own account and a unique password. Sessions expire after 8 hours. Sign out on shared devices. A password change signs out every device for that account.",
              "اپنا اکاؤنٹ اور منفرد پاس ورڈ استعمال کریں۔ سیشن 8 گھنٹے بعد ختم ہوتا ہے۔ مشترکہ آلے پر سائن آؤٹ کریں۔ پاس ورڈ بدلنے سے تمام آلات سائن آؤٹ ہو جاتے ہیں۔",
            )}
          </p>
        </article>
        <article>
          <ShieldCheck size={23} />
          <h3>
            {t("No customer data offline", "گاہک کی معلومات آف لائن نہیں")}
          </h3>
          <p>
            {t(
              "The admin app does not cache customer names, addresses, phone numbers or order responses. Keep screenshots and printed receipts private too.",
              "ایڈمن ایپ گاہک کے نام، پتے، فون یا آرڈر محفوظ نہیں کرتی۔ اسکرین شاٹ اور پرنٹ شدہ رسید بھی محفوظ رکھیں۔",
            )}
          </p>
        </article>
      </div>
      <div className="admin-guidance">
        <Banknote size={24} />
        <div>
          <strong>
            {t(
              "Always cash on delivery or collection.",
              "ہمیشہ ڈیلیوری یا پک اَپ پر نقد ادائیگی۔",
            )}
          </strong>
          <p>
            {t(
              "No card numbers or online payment details should ever be requested from customers through this system.",
              "اس سسٹم میں گاہک سے کارڈ نمبر یا آن لائن ادائیگی کی معلومات کبھی نہ مانگیں۔",
            )}
          </p>
        </div>
        <CheckCircle2 size={21} />
      </div>
    </>
  );
}
