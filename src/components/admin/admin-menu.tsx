"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Check,
  CircleCheck,
  Pencil,
  RefreshCw,
  Search,
  ShieldCheck,
  UtensilsCrossed,
} from "lucide-react";
import type { AdminMenuItem } from "@/lib/admin-types";
import { adminError, adminRequest, rupeesToPaisa } from "@/lib/admin-client";
import { formatPrice } from "@/lib/format";
import { useLanguage } from "../language-provider";
import { useAdmin } from "./admin-shell";
import { AdminDialog } from "./admin-dialog";

export function AdminMenu() {
  const { session } = useAdmin();
  const { t, isUr } = useLanguage();
  const [items, setItems] = useState<AdminMenuItem[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState<AdminMenuItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    adminRequest<{ items: AdminMenuItem[] }>("menu", {
      signal: controller.signal,
    })
      .then((result) => {
        setItems(result.items);
        setError("");
      })
      .catch((caught) => {
        if (!controller.signal.aborted) setError(adminError(caught, isUr));
      });
    return () => controller.abort();
  }, [reload, isUr]);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || !session) return;
    const form = new FormData(event.currentTarget);
    const pricePaisa = rupeesToPaisa(String(form.get("price")));
    if (pricePaisa === null || pricePaisa <= 0) {
      setEditError(
        t(
          "Enter a valid rupee price with no more than two decimal places.",
          "درست قیمت درج کریں۔ اعشاریے کے بعد زیادہ سے زیادہ دو ہندسے ہوں۔",
        ),
      );
      return;
    }
    setSaving(true);
    setEditError("");
    try {
      await adminRequest(`menu/${editing.id}`, {
        method: "PATCH",
        csrfToken: session.csrfToken,
        data: {
          name: String(form.get("name")),
          nameUr: String(form.get("nameUr")),
          description: String(form.get("description")),
          descriptionUr: String(form.get("descriptionUr")),
          pricePaisa,
          available: form.get("available") === "on",
          approved: form.get("approved") === "on",
          version: editing.version,
        },
      });
      setEditing(null);
      setReload((value) => value + 1);
      setNotice(
        t(
          "Menu item saved. The website will use the updated details on its next load.",
          "مینو محفوظ ہو گیا۔ ویب سائٹ اگلی بار کھلنے پر نئی معلومات دکھائے گی۔",
        ),
      );
    } catch (caught) {
      setEditError(adminError(caught, isUr));
    } finally {
      setSaving(false);
    }
  }
  const filtered =
    items?.filter((item) =>
      `${item.name} ${item.nameUr}`.toLowerCase().includes(query.toLowerCase()),
    ) ?? [];
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="admin-kicker">
            {t("THE GOOD STUFF", "ذائقے دار مینو")}
          </span>
          <h1>
            {t("A menu worth coming back for.", "ایسا مینو جس کا دل چاہے۔")}
          </h1>
          <p>
            {t(
              "Keep prices accurate, availability clear, and every dish ready to order.",
              "قیمتیں درست رکھیں اور ہر کھانے کی دستیابی واضح کریں۔",
            )}
          </p>
        </div>
        <button
          className="admin-button subtle"
          onClick={() => setReload((value) => value + 1)}
        >
          <RefreshCw size={16} />
          {t("Refresh", "تازہ کریں")}
        </button>
      </div>
      <div className="admin-guidance">
        <ShieldCheck size={23} />
        <div>
          <strong>
            {t(
              "You are in control of what goes live.",
              "کون سی اشیا دکھانی ہیں، فیصلہ آپ کا ہے۔",
            )}
          </strong>
          <p>
            {t(
              "Only approved items appear in the live menu. Verify the name, serving, price and tax treatment before approving. Availability controls whether customers can add an item.",
              "صرف منظور شدہ اشیا اصل مینو میں آتی ہیں۔ منظوری سے پہلے نام، مقدار، قیمت اور ٹیکس چیک کریں۔ دستیابی سے طے ہوتا ہے کہ گاہک چیز آرڈر کر سکتے ہیں یا نہیں۔",
            )}
          </p>
        </div>
      </div>
      {notice && (
        <div className="admin-alert success" role="status">
          <CircleCheck size={17} />
          {notice}
        </div>
      )}
      {error && (
        <p className="admin-alert error" role="alert">
          {error}
        </p>
      )}
      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <h2>
              {t("Your menu", "آپ کا مینو")}{" "}
              <span className="admin-count">{items?.length ?? 0}</span>
            </h2>
            <p>
              {t(
                "English and Urdu, side by side.",
                "انگریزی اور اردو، ایک ساتھ۔",
              )}
            </p>
          </div>
          <label className="admin-search">
            <Search size={17} />
            <input
              aria-label={t("Search menu items", "مینو میں تلاش کریں")}
              placeholder={t("Find a dish...", "کھانا تلاش کریں")}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>
        <div className="admin-menu-grid">
          {filtered.map((item) => (
            <article className="admin-menu-item" key={item.id}>
              <div className="admin-menu-photo">
                <Image
                  src={item.image}
                  alt={item.imageAlt}
                  fill
                  sizes="(max-width: 600px) 90vw, 350px"
                />
                <span
                  className={`menu-approval ${item.approved ? "approved" : ""}`}
                >
                  {item.approved && <Check size={12} />}
                  {t(
                    item.approved ? "Approved" : "Needs approval",
                    item.approved ? "منظور شدہ" : "منظوری درکار",
                  )}
                </span>
              </div>
              <div className="admin-menu-item-copy">
                <small>{item.category}</small>
                <h3>{isUr && item.nameUr ? item.nameUr : item.name}</h3>
                <p>
                  {isUr
                    ? item.name
                    : item.nameUr ||
                      t("Urdu translation not added", "اردو ترجمہ موجود نہیں")}
                </p>
                <div>
                  <strong dir="ltr">{formatPrice(item.pricePaisa)}</strong>
                  <span
                    className={
                      item.available ? "item-available" : "item-unavailable"
                    }
                  >
                    <i />
                    {t(
                      item.available ? "Available" : "Unavailable",
                      item.available ? "دستیاب" : "دستیاب نہیں",
                    )}
                  </span>
                </div>
                <button
                  className="admin-button subtle wide"
                  onClick={() => {
                    setEditing(item);
                    setEditError("");
                  }}
                >
                  <Pencil size={14} />
                  {t("Edit item", "ترمیم کریں")}
                </button>
              </div>
            </article>
          ))}
        </div>
        {items && !filtered.length && (
          <div className="admin-empty">
            <UtensilsCrossed size={35} />
            <h3>{t("No matching dishes.", "کوئی متعلقہ کھانا نہیں ملا۔")}</h3>
            <p>
              {t(
                "Try a different name, or run the setup to create your initial catalog.",
                "دوسرا نام تلاش کریں، یا ابتدائی مینو کے لیے سیٹ اَپ چلائیں۔",
              )}
            </p>
          </div>
        )}
        {!items && !error && (
          <div className="admin-empty">
            <RefreshCw className="spin" size={25} />
            <p>{t("Loading your menu...", "مینو حاصل ہو رہا ہے۔")}</p>
          </div>
        )}
      </section>
      <AdminDialog
        open={!!editing}
        title={t("A little menu update.", "مینو میں تبدیلی۔")}
        busy={saving}
        onClose={() => setEditing(null)}
      >
        {editing && (
          <form method="post" key={editing.id} className="admin-form" onSubmit={save}>
            <div className="admin-form-columns">
              <label className="admin-field">
                {t("Name in English", "انگریزی نام")}
                <input
                  name="name"
                  defaultValue={editing.name}
                  maxLength={120}
                  minLength={2}
                  required
                  disabled={saving}
                  dir="ltr"
                />
              </label>
              <label className="admin-field">
                {t("Name in Urdu", "اردو نام")}
                <input
                  name="nameUr"
                  defaultValue={editing.nameUr}
                  maxLength={120}
                  disabled={saving}
                  dir="rtl"
                  lang="ur"
                />
              </label>
            </div>
            <label className="admin-field">
              {t("English description", "انگریزی تفصیل")}
              <textarea
                name="description"
                defaultValue={editing.description}
                maxLength={1000}
                required
                disabled={saving}
                dir="ltr"
              />
            </label>
            <label className="admin-field">
              {t("Urdu description", "اردو تفصیل")}
              <textarea
                name="descriptionUr"
                defaultValue={editing.descriptionUr}
                maxLength={1000}
                disabled={saving}
                dir="rtl"
                lang="ur"
              />
            </label>
            <label className="admin-field">
              {t("Final item price (PKR)", "چیز کی حتمی قیمت، روپے میں")}
              <input
                name="price"
                inputMode="decimal"
                defaultValue={String(editing.pricePaisa / 100)}
                pattern="[0-9]+([.][0-9]{1,2})?"
                required
                disabled={saving}
                dir="ltr"
              />
              <small>
                {t(
                  "Enter rupees, not paisa. Include any applicable tax in the approved price.",
                  "قیمت روپے میں درج کریں، پیسوں میں نہیں۔ لاگو ٹیکس منظور شدہ قیمت میں شامل رکھیں۔",
                )}
              </small>
            </label>
            <label className="admin-check">
              <input
                type="checkbox"
                name="available"
                defaultChecked={editing.available}
                disabled={saving}
              />
              <span>
                <strong>{t("Available to order", "آرڈر کے لیے دستیاب")}</strong>
                <small>
                  {t(
                    "Turn off when this item is sold out.",
                    "چیز ختم ہونے پر بند کریں۔",
                  )}
                </small>
              </span>
            </label>
            <label className="admin-check">
              <input
                type="checkbox"
                name="approved"
                defaultChecked={editing.approved}
                disabled={saving}
              />
              <span>
                <strong>
                  {t("Approved for the live menu", "اصل مینو کے لیے منظور شدہ")}
                </strong>
                <small>
                  {t(
                    "I have checked this item's details and final price.",
                    "میں نے اس چیز کی تفصیل اور حتمی قیمت چیک کر لی ہے۔",
                  )}
                </small>
              </span>
            </label>
            {editError && (
              <p className="admin-alert error" role="alert">
                {editError}
              </p>
            )}
            <button
              className="admin-button solid wide"
              type="submit"
              disabled={saving}
            >
              {saving ? (
                <RefreshCw className="spin" size={16} />
              ) : (
                <Check size={16} />
              )}
              {t(
                saving ? "Saving..." : "Save changes",
                saving ? "محفوظ ہو رہا ہے" : "تبدیلیاں محفوظ کریں",
              )}
            </button>
          </form>
        )}
      </AdminDialog>
    </>
  );
}
