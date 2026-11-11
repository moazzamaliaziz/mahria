"use client";

import { useDeferredValue, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  CookingPot,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Utensils,
  X,
} from "lucide-react";
import { formatPrice } from "@/lib/format";
import { useShop } from "./shop-provider";
import { useLanguage } from "./language-provider";

const categories = [
  "All favourites",
  "Pulao",
  "From the kitchen",
  "Sides & sweets",
] as const;
const icons = [Utensils, CookingPot, Sparkles, Utensils];
const categoriesUr = ["تمام پسندیدہ پکوان", "پلاؤ", "باورچی خانے سے", "لوازمات اور میٹھا"];
const labelsUr: Record<string, string> = {
  "The signature": "خاص ذائقہ", "Mehria special": "مہریہ اسپیشل",
  "Spice things up": "مسالے دار", "A sweet finish": "میٹھا اختتام",
  "Single serving": "ایک فرد کے لیے", "One serving": "ایک سرونگ", "12 pieces": "بارہ عدد",
};

export function MenuSection({ full = false }: { full?: boolean }) {
  const { storefront, addItem } = useShop();
  const { t, isUr } = useLanguage();
  const [category, setCategory] = useState<string>("All favourites");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recommended");
  const search = useDeferredValue(query.trim().toLowerCase());
  let items = storefront.items.filter(
    (item) =>
      (category === "All favourites" || item.category === category) &&
      `${item.name} ${item.description} ${item.nameUr ?? ""} ${item.descriptionUr ?? ""}`.toLowerCase().includes(search),
  );
  if (sort === "price-low")
    items = [...items].sort((a, b) => a.pricePaisa - b.pricePaisa);
  if (sort === "price-high")
    items = [...items].sort((a, b) => b.pricePaisa - a.pricePaisa);
  if (!full && !search && category === "All favourites")
    items = items.slice(0, 4);

  return (
    <section
      className={`menu-section section-shell ${full ? "full-menu-section" : ""}`}
      id="menu"
      aria-labelledby="menu-heading"
    >
      <div className="section-heading">
        <div>
          <span className="eyebrow">
            <Sparkles size={15} /> {t("FROM OUR KITCHEN, WITH LOVE", "ہمارے باورچی خانے سے، محبت کے ساتھ")}
          </span>
          <h2 id="menu-heading">
            {t(full ? "Find your" : "Meet your next", "اپنا پسندیدہ")} <em>{t("favourite.", "ذائقہ چنیں۔")}</em>
          </h2>
        </div>
        {!full && (
          <Link href="/menu" className="text-link">
            {t("Explore the full menu", "مکمل مینو دیکھیں")} <ArrowUpRight size={20} />
          </Link>
        )}
      </div>
      <div className="menu-tools">
        <div
          className="category-tabs"
          role="group"
          aria-label={t("Filter menu by category", "قسم کے مطابق پکوان دیکھیں")}
        >
          {categories.map((name, index) => {
            const Icon = icons[index];
            return (
              <button
                key={name}
                onClick={() => setCategory(name)}
                aria-pressed={category === name}
                className={category === name ? "active" : ""}
              >
                <Icon size={16} />
                {t(name, categoriesUr[index])}
              </button>
            );
          })}
        </div>
        <div className="menu-search">
          <Search size={17} />
          <input
            type="search"
            aria-label={t("Search the menu", "مینو میں تلاش کریں")}
            placeholder={t("Find a craving...", "اپنا پسندیدہ پکوان تلاش کریں...")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button
              aria-label={t("Clear search", "تلاش صاف کریں")}
              className="search-clear"
              onClick={() => setQuery("")}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
      {full && (
        <div className="menu-result-bar">
          <span role="status">{t(`${items.length} delicious possibilities`, `${items.length} لذیذ انتخاب`)}</span>
          <label>
            <SlidersHorizontal size={14} />
            <span className="sr-only">{t("Sort menu", "مینو کی ترتیب")}</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="recommended">{t("Menu order", "مینو کی اصل ترتیب")}</option>
              <option value="price-low">{t("Price: low to high", "قیمت: کم سے زیادہ")}</option>
              <option value="price-high">{t("Price: high to low", "قیمت: زیادہ سے کم")}</option>
            </select>
          </label>
        </div>
      )}
      <div className="product-grid">
        {items.map((item) => (
          <article className="product-card" key={item.id}>
            <div className={`product-image product-${item.id}`}>
              <Image
                src={item.image}
                 alt={isUr && item.nameUr ? `${item.nameUr}، مینو کی تصویر` : item.imageAlt}
                fill
                sizes="(max-width: 540px) 92vw, (max-width: 900px) 46vw, 24vw"
              />
              {item.badge && (
                <span
                  className={`product-badge ${item.id === "special-pulao" ? "badge-red" : ""}`}
                >
                  {t(item.badge, labelsUr[item.badge] ?? item.badge)}
                </span>
              )}
              <span className="image-portion">{t(item.portion, labelsUr[item.portion] ?? item.portion)}</span>
            </div>
            <div className="product-copy">
              <span className="product-category">{t(item.category, categoriesUr[categories.indexOf(item.category)] ?? item.category)}</span>
              <h3>{isUr ? item.nameUr || item.name : item.name}</h3>
              <p>{isUr ? item.descriptionUr || item.description : item.description}</p>
              <div className="product-footer">
                <div>
                  <span className="price-label">
                    {storefront.mode === "live" ? t("PRICE", "قیمت") : t("REFERENCE PRICE", "حوالے کی قیمت")}
                  </span>
                  <strong><bdi dir="ltr">{formatPrice(item.pricePaisa)}</bdi></strong>
                </div>
                <button
                  className="add-button"
                  disabled={!item.available}
                  onClick={() => addItem(item)}
                  aria-label={t(`Add ${item.name} to bag`, `${item.nameUr || item.name} بیگ میں شامل کریں`)}
                >
                  <Plus size={18} />
                  <span>{item.available ? t("Add", "شامل کریں") : t("Unavailable", "دستیاب نہیں")}</span>
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {!items.length && (
        <div className="menu-empty">
          <Search size={35} />
          <h3>{t("No match for that craving.", "اس نام کا کوئی پکوان نہیں ملا۔")}</h3>
          <p>{t("Try searching for pulao, biryani or something sweet.", "پلاؤ، بریانی یا کسی میٹھے پکوان کا نام تلاش کریں۔")}</p>
          <button
            className="button outline"
            onClick={() => {
              setQuery("");
              setCategory("All favourites");
            }}
          >
            {t("Show all favourites", "تمام پسندیدہ پکوان دکھائیں")}
          </button>
        </div>
      )}
      {storefront.mode !== "live" && (
        <p className="menu-source-note">
          {storefront.mode === "unavailable"
            ? t("Direct ordering is temporarily unavailable. ", "ویب سائٹ سے آرڈر فی الحال دستیاب نہیں۔ ")
            : t("Preview menu. ", "یہ مینو کا پیش نظارہ ہے۔ ")}
          {t("Published Foodpanda reference prices, not confirmed direct-order prices. Photos and serving presentation may vary.", "قیمتیں فوڈ پانڈا کی شائع شدہ فہرست سے بطور حوالہ لی گئی ہیں، براہِ راست آرڈر کے لیے تصدیق شدہ نہیں۔ پیش کیے جانے والے کھانے کی شکل اور مقدار تصویر سے مختلف ہو سکتی ہے۔")}{" "}
          <Link href="/about-this-preview">
            {t("About this preview", "اس پیش نظارے کے بارے میں")} <ArrowUpRight size={12} />
          </Link>
        </p>
      )}
      {storefront.mode === "live" && !storefront.orderingEnabled && <p className="menu-source-note" role="status">{t("The approved menu is available to browse. Direct ordering is currently paused. Please call the restaurant to check availability.", "منظور شدہ مینو دیکھا جا سکتا ہے۔ ویب سائٹ سے آرڈر فی الحال بند ہیں۔ دستیابی معلوم کرنے کے لیے ریستوران کو فون کریں۔")} <Link href="/contact">{t("Contact Mehria", "مہریہ سے رابطہ کریں")}</Link></p>}
    </section>
  );
}
