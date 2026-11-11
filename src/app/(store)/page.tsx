"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock3,
  CookingPot,
  Heart,
  MapPin,
  Phone,
  ShoppingBag,
  Sparkles,
  Utensils,
} from "lucide-react";
import { MenuSection } from "@/components/menu-section";
import { business } from "@/lib/business";
import { useLanguage } from "@/components/language-provider";

export default function HomePage() {
  const { t } = useLanguage();
  return (
    <main id="main-content">
      <section className="hero section-shell" aria-labelledby="hero-heading">
        <div className="hero-copy">
          <div className="hero-eyebrow">
            <span className="line" /> {t("ISLAMABAD'S OWN. FULL OF FLAVOUR.", "اسلام آباد کا اپنا، ذائقے سے بھرپور۔")}
          </div>
          <h1 id="hero-heading">
            {t("A little more", "کچھ اور")}
            <br />
            {t("flavour.", "ذائقہ۔")}
            <br />
            <em>{t("A taste of home.", "گھر جیسا مزہ۔")}</em>
          </h1>
          <p>
            {t("Some cravings lead you back to the classics.", "کچھ ذائقے بار بار اپنی طرف بلاتے ہیں۔")}
            <br className="desktop-break" /> {t("Fragrant pulao. Tender chicken. That familiar first bite.", "خوشبودار پلاؤ، نرم چکن، وہی مانوس پہلا نوالہ۔")}
            <br className="desktop-break" /> {t("Welcome to the Mehria table.", "مہریہ کے دسترخوان پر خوش آمدید۔")}
          </p>
          <div className="hero-actions">
            <Link href="/menu" className="button primary">
              {t("Find your favourite", "اپنا پسندیدہ چنیں")} <ArrowUpRight size={19} />
            </Link>
            <Link href="/our-story" className="hero-story-link">
              {t("A taste of our story", "ہماری کہانی کی ایک جھلک")}{" "}
              <span>
                <ArrowRight size={18} />
              </span>
            </Link>
          </div>
          <div className="hero-footnote">
            <span className="hero-footnote-icon">
              <CookingPot size={21} />
            </span>
            <span>
              {t("Comfort food. Pakistani soul.", "دل کو بھائے، پاکستان کا ذائقہ۔")}
              <small>{t("From G-11 Markaz, with love.", "جی الیون مرکز سے، محبت کے ساتھ۔")}</small>
            </span>
          </div>
        </div>
        <div className="hero-art">
          <span className="hero-vertical">
            {t("THE SIMPLE JOY OF A REALLY GOOD MEAL", "اچھے کھانے کی سادہ سی خوشی")}
          </span>
          <div className="hero-photo-frame">
            <Image
              src="/images/mehria-food.jpg"
              alt={t("Mehria's chicken pulao topped with shami kababs, photographed for its restaurant listing", "مہریہ کی ریستوران فہرست سے چکن پلاؤ اور شامی کباب کی تصویر")}
              fill
              sizes="(max-width: 760px) 95vw, 51vw"
              priority
              className="hero-food"
            />
            <div className="hero-photo-shade" />
            <span className="photo-corner">{t("THE MEHRIA CLASSIC", "مہریہ کا مانوس ذائقہ")}</span>
          </div>
          <div className="round-stamp">
            <span>{t("GOOD FOOD", "اچھا کھانا")}</span>
            <Heart size={25} strokeWidth={1.5} />
            <span>{t("GOOD MOOD", "خوشگوار لمحے")}</span>
          </div>
          <div className="hero-dish-label">
            <span className="dish-label-icon">
              <Utensils size={23} />
            </span>
            <div>
              <span>{t("THE ONE THAT STARTED THE CRAVING", "وہ ذائقہ جو دل کو بھائے")}</span>
              <strong>{t("Chicken Pulao & Shami", "چکن پلاؤ اور شامی")}</strong>
            </div>
            <Link href="/menu" aria-label={t("Explore chicken pulao on the menu", "مینو میں چکن پلاؤ دیکھیں")}>
              <ArrowUpRight size={23} />
            </Link>
          </div>
          <div className="hero-doodle" aria-hidden="true">
            <svg viewBox="0 0 100 65" fill="none">
              <path
                d="M6 11c26 1 22 41 61 36m0 0L52 34m15 13L51 59"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <span>{t("your next craving", "آپ کا اگلا پسندیدہ")}</span>
          </div>
        </div>
      </section>
      <div className="flavour-strip" aria-hidden="true">
        <div>
          <span>{t("BIG ON FLAVOUR", "بھرپور ذائقہ")}</span>
          <Sparkles size={19} />
          <span>{t("ROOTED IN TRADITION", "روایتی انداز")}</span>
          <Sparkles size={19} />
          <span>{t("BETTER TOGETHER", "مل بیٹھنے کا مزہ")}</span>
          <Sparkles size={19} />
          <span>{t("ALWAYS A GOOD IDEA", "ہمیشہ دل کو بھائے")}</span>
          <Sparkles size={19} />
        </div>
      </div>
      <MenuSection />
      <section
        className="sharing-section section-shell"
        aria-labelledby="sharing-heading"
      >
        <div className="sharing-banner">
          <div className="sharing-copy">
            <span className="eyebrow">{t("MORE PEOPLE. MORE MEMORIES.", "اپنوں کا ساتھ، یادگار لمحات۔")}</span>
            <h2 id="sharing-heading">
              {t("Good food tastes better", "کھانے کا لطف دوبالا ہو")}
              <br />
              <em>{t("with your people.", "جب اپنے ساتھ ہوں۔")}</em>
            </h2>
            <p>
              {t("Family lunches, office catch-ups, or a spontaneous get-together.", "گھر والوں کے ساتھ دوپہر کا کھانا، دفتر کے ساتھی یا اچانک مل بیٹھنا۔")}
              <br />
              {t("Bring the people. Let Mehria bring the flavour.", "اپنوں کو بلائیں، مہریہ کے ذائقے کے ساتھ۔")}
            </p>
            <a href={`tel:${business.phone}`} className="button cream">
              {t("Let's plan your order", "اپنے آرڈر کی بات کریں")} <ArrowUpRight size={19} />
            </a>
            <span className="sharing-note">
              {t("Call to discuss larger orders and availability.", "بڑے آرڈر اور دستیابی کے لیے فون پر بات کریں۔")}
            </span>
          </div>
          <div className="sharing-art">
            <Image
              src="/images/mehria-table.jpg"
              alt={t("Mehria's published photograph of pulao with shami kababs, raita and salad", "مہریہ کی شائع شدہ تصویر: پلاؤ، شامی کباب، رائتہ اور سلاد")}
              fill
              sizes="(max-width: 760px) 100vw, 45vw"
            />
            <div className="sharing-stamp">
              <span>{t("A TABLE", "دسترخوان")}</span>
              <Heart size={20} />
              <span>{t("FOR EVERYONE", "سب کے لیے")}</span>
            </div>
          </div>
        </div>
      </section>
      <section
        className="story-section section-shell"
        id="story"
        aria-labelledby="story-heading"
      >
        <div className="story-art">
          <div className="story-image">
            <Image
              src="/images/mehria-table.jpg"
              alt={t("A welcoming spread of pulao, shami kababs, raita and fresh salad from Mehria's listing", "مہریہ کی فہرست سے پلاؤ، شامی کباب، رائتے اور سلاد کا دسترخوان")}
              fill
              sizes="(max-width: 760px) 90vw, 42vw"
            />
          </div>
          <span className="story-annotation">
            {t("Simple ingredients.", "سادہ سا کھانا۔")}
            <br />{t("A whole lot of feeling.", "اپنائیت سے بھرپور۔")}
          </span>
          <span className="story-outline" aria-hidden="true" />
          <div className="story-small-stamp">
            <CookingPot size={27} />
            <span>
              {t("PAKISTANI", "پاکستانی")}
              <br />
              {t("AT HEART", "دل سے")}
            </span>
          </div>
        </div>
        <div className="story-copy">
          <span className="eyebrow">
            <Sparkles size={15} /> {t("THE MEHRIA WAY", "مہریہ کا انداز")}
          </span>
          <h2 id="story-heading">
            {t("Not just a meal.", "صرف کھانا نہیں۔")}
            <br />
            <em>{t("A familiar feeling.", "اپنائیت کا احساس۔")}</em>
          </h2>
          <p>
            {t("There is something about a plate of pulao. The aroma before the first bite. The shami kabab on the side. The conversation that lasts a little longer.", "پلاؤ کی پلیٹ کی بات ہی کچھ اور ہے۔ پہلے نوالے سے پہلے اٹھتی خوشبو، ساتھ شامی کباب اور باتوں کا ذرا طویل ہو جانا۔")}
          </p>
          <p>
            {t("At Mehria Murgh Pulao in G-11 Markaz, that familiar combination is the heart of the menu. From a simple lunch to a table full of favourites, there is always a reason to make room for a classic.", "جی الیون مرکز میں مہریہ مرغ پلاؤ کے مینو کا مرکز یہی مانوس امتزاج ہے۔ سادہ دوپہر کا کھانا ہو یا پسندیدہ پکوانوں سے سجا دسترخوان، روایتی ذائقے کی جگہ ہمیشہ رہتی ہے۔")}
          </p>
          <div className="story-values">
            <span>
              <Check size={15} /> {t("Familiar Pakistani flavours", "مانوس پاکستانی ذائقے")}
            </span>
            <span>
              <Check size={15} /> {t("A menu made for every craving", "اپنی پسند کے مطابق انتخاب")}
            </span>
          </div>
          <Link href="/our-story" className="text-link">
            {t("A taste of Mehria", "مہریہ کی کہانی پڑھیں")} <ArrowUpRight size={20} />
          </Link>
        </div>
      </section>
      <section className="ritual-section">
        <div className="section-shell ritual-inner">
          <div>
            <span className="eyebrow">
              {t("THERE'S A MEHRIA MOMENT FOR THAT", "ہر لمحے میں کچھ مہریہ")}
            </span>
            <h2>
              {t("Lunch plans?", "دوپہر کے کھانے کا ارادہ؟")}
              <br />
              <em>{t("Consider them sorted.", "پسندیدہ پکوان چنیں۔")}</em>
            </h2>
          </div>
          <div className="ritual-item">
            <CookingPot strokeWidth={1.4} />
            <h3>{t("The everyday favourite", "ہر دن کا پسندیدہ")}</h3>
            <p>{t("A proper plate of pulao for a well-deserved lunch break.", "کھانے کے وقفے میں پلاؤ کی ایک بھرپور پلیٹ۔")}</p>
          </div>
          <div className="ritual-item">
            <ShoppingBag strokeWidth={1.4} />
            <h3>{t("Your food, your way", "آپ کا کھانا، آپ کی پسند")}</h3>
            <p>{t("Pick up from G-11 or explore delivery on Foodpanda.", "جی الیون سے خود وصول کریں یا فوڈ پانڈا پر ڈیلیوری دیکھیں۔")}</p>
          </div>
          <div className="ritual-item">
            <Heart strokeWidth={1.4} />
            <h3>{t("A little extra joy", "خوشی کچھ اور بڑھائیں")}</h3>
            <p>{t("Add a shami, finish with zarda. Make the meal your own.", "ساتھ شامی لیں، آخر میں زردہ۔ اپنی پسند کا کھانا بنائیں۔")}</p>
          </div>
        </div>
      </section>
      <section
        className="visit-section section-shell"
        id="visit"
        aria-labelledby="visit-heading"
      >
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              <MapPin size={14} /> {t("AROUND THE CORNER, IN ISLAMABAD", "آپ کے قریب، اسلام آباد میں")}
            </span>
            <h2 id="visit-heading">
              {t("Follow the", "ذائقے کی")} <em>{t("flavour.", "طرف آئیں۔")}</em>
            </h2>
          </div>
          <a
            href={business.maps}
            target="_blank"
            rel="noopener noreferrer"
            className="text-link"
          >
            {t("Find us on the map", "نقشے پر دیکھیں")} <ArrowUpRight size={20} />
          </a>
        </div>
        <div className="visit-grid">
          <div className="location-photo">
            <Image
              src="/images/mehria-storefront.jpg"
              alt={t("Mehria Murgh Pulao's yellow storefront in G-11 Markaz, photographed in August 2024", "جی الیون مرکز میں مہریہ مرغ پلاؤ کی زرد دکان، اگست 2024 کی تصویر")}
              fill
              sizes="(max-width: 760px) 94vw, 55vw"
            />
            <div className="location-overlay">
              <span>
                <MapPin size={16} /> {t("G-11 MARKAZ", "جی الیون مرکز")}
              </span>
              <p>{t("Your next food stop.", "آپ کے کھانے کی اگلی منزل۔")}</p>
            </div>
            <span className="photo-date">
              {t("Public listing photo, August 2024", "عوامی فہرست کی تصویر، اگست 2024")}
            </span>
          </div>
          <div className="location-details">
            <span className="location-kicker">{t("COME HUNGRY. LEAVE HAPPY.", "بھوک لے کر آئیں، خوشی ساتھ لے جائیں۔")}</span>
            <h3>{t("Mehria, G-11 Markaz", "مہریہ، جی الیون مرکز")}</h3>
            <div className="location-detail">
              <MapPin />
              <div>
                <strong>{t("Right here in the neighbourhood", "یہیں آپ کے علاقے میں")}</strong>
                <p>
                  {t(business.address, "الغفار پلازہ، جی الیون مرکز")}
                  <br />
                  {t(business.city, "اسلام آباد، پاکستان")}
                </p>
              </div>
            </div>
            <div className="location-detail">
              <Clock3 />
              <div>
                <strong>{t("Make it a Mehria day", "آج کا دن مہریہ کے ساتھ")}</strong>
                <p>
                  {t("Monday - Sunday", "پیر تا اتوار")}
                  <br />
                  <bdi dir="ltr">{business.hours}</bdi>
                </p>
                <small>{t("Published hours. Please call to confirm.", "یہ شائع شدہ اوقات ہیں۔ براہِ کرم فون پر تصدیق کریں۔")}</small>
              </div>
            </div>
            <div className="location-detail">
              <Phone />
              <div>
                <strong>{t("A call away", "بس ایک فون کی دوری")}</strong>
                <a href={`tel:${business.phone}`}><bdi dir="ltr">{business.displayPhone}</bdi></a>
              </div>
            </div>
            <div className="location-actions">
              <a
                href={business.maps}
                className="button primary"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("Get directions", "راستہ دیکھیں")} <ArrowUpRight size={17} />
              </a>
              <a href={`tel:${business.phone}`} className="button outline">
                {t("Call us", "فون کریں")} <Phone size={16} />
              </a>
            </div>
          </div>
        </div>
      </section>
      <div className="public-help section-shell">
        <p>{t("A question before you order?", "آرڈر سے پہلے کوئی سوال؟")}</p>
        <Link href="/faqs" className="text-link">{t("Ordering FAQs", "آرڈر کے عام سوالات")} <ArrowRight size={17} /></Link>
        <Link href="/contact" className="text-link">{t("Contact the restaurant", "ریستوران سے رابطہ")} <Phone size={16} /></Link>
      </div>
      <section className="closing-note section-shell">
        <Sparkles size={24} />
        <p>
          {t("Life's better with", "زندگی میں شامل کریں")} <em>{t("a little Mehria.", "کچھ مہریہ۔")}</em>
        </p>
        <Link href="/menu" aria-label={t("Explore the menu", "مینو دیکھیں")}>
          <ArrowUpRight size={27} />
        </Link>
      </section>
      <a className="back-top" href="#main-content" aria-label={t("Back to top", "صفحے کے اوپر جائیں")}>
        <ArrowDown size={16} />
      </a>
    </main>
  );
}
