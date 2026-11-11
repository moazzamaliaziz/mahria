"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ExternalLink,
  Info,
  LoaderCircle,
  MapPin,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import {
  getCartSnapshot,
  getServerCartSnapshot,
  saveCart,
  subscribeCart,
} from "@/lib/cart";
import { business } from "@/lib/business";
import { formatPrice } from "@/lib/format";
import { useLanguage } from "./language-provider";
import type {
  MenuItem,
  OrderInput,
  OrderReceipt,
  Storefront,
} from "@/lib/types";

type ShopContextValue = {
  storefront: Storefront;
  count: number;
  addItem: (item: MenuItem) => void;
  openBag: () => void;
};

const ShopContext = createContext<ShopContextValue | null>(null);
const statusLabels: Record<OrderReceipt["status"], [string, string]> = {
  pending: ["Awaiting confirmation", "تصدیق کا انتظار"],
  confirmed: ["Confirmed", "تصدیق ہو گئی"],
  preparing: ["Being prepared", "تیار کیا جا رہا ہے"],
  ready: ["Ready for pickup", "وصولی کے لیے تیار"],
  out_for_delivery: ["Out for delivery", "ترسیل کے لیے روانہ"],
  completed: ["Completed", "مکمل ہو گیا"],
  cancelled: ["Cancelled", "منسوخ ہو گیا"],
};

export function useShop() {
  const value = useContext(ShopContext);
  if (!value) throw new Error("ShopProvider is required.");
  return value;
}

export function ShopProvider({
  storefront,
  children,
}: {
  storefront: Storefront;
  children: ReactNode;
}) {
  const { t, isUr } = useLanguage();
  const saved = useSyncExternalStore(
    subscribeCart,
    getCartSnapshot,
    getServerCartSnapshot,
  );
  const [panel, setPanel] = useState<"bag" | "checkout" | null>(null);
  const [toast, setToast] = useState<[string, string] | null>(null);
  const [fulfillment, setFulfillment] = useState<"pickup" | "delivery">(
    "pickup",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const attempt = useRef<{ body: string; key: string } | null>(null);
  const lines = saved.flatMap((line) => {
    const item = storefront.items.find((product) => product.id === line.itemId);
    return item ? [{ ...line, item }] : [];
  });
  const count = lines.reduce((total, line) => total + line.quantity, 0);
  const subtotal = lines.reduce(
    (total, line) => total + line.quantity * line.item.pricePaisa,
    0,
  );
  const delivery = fulfillment === "delivery" ? storefront.deliveryFeePaisa : 0;
  const total = subtotal + delivery;
  const unavailable = lines.some((line) => !line.item.available);
  const removedCount = saved.length - lines.length;

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (panel) {
      if (!element.open) element.showModal();
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previous;
      };
    }
    element.close();
  }, [panel]);

  function addItem(item: MenuItem) {
    if (!item.available) return;
    const existing = lines.find((line) => line.itemId === item.id);
    if ((existing?.quantity ?? 0) >= 20 || count >= 50) {
      setToast(["Maximum 20 of each item and 50 items per order.", "ہر پکوان کی زیادہ سے زیادہ 20 اور ایک آرڈر میں کُل 50 اشیا شامل کی جا سکتی ہیں۔"]);
      return;
    }
    const next = lines.map(({ itemId, quantity }) => ({ itemId, quantity }));
    if (existing) next.find((line) => line.itemId === item.id)!.quantity += 1;
    else next.push({ itemId: item.id, quantity: 1 });
    saveCart(next);
    setToast([`${item.name} added to your bag`, `${item.nameUr || item.name} آپ کے بیگ میں شامل کر دیا گیا`]);
  }

  function changeQuantity(itemId: string, quantity: number) {
    if (
      quantity > 20 ||
      (count + 1 > 50 &&
        quantity >
          (lines.find((line) => line.itemId === itemId)?.quantity ?? 0))
    )
      return;
    saveCart(
      lines
        .map((line) => ({
          itemId: line.itemId,
          quantity: line.itemId === itemId ? quantity : line.quantity,
        }))
        .filter((line) => line.quantity > 0),
    );
  }

  function openBag() {
    setReceipt(null);
    setError("");
    setPanel("bag");
  }

  async function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!storefront.orderingEnabled || submitting || unavailable || !count)
      return;
    setError("");
    const data = new FormData(event.currentTarget);
    const input: Omit<OrderInput, "idempotencyKey"> = {
      customerName: String(data.get("customerName") ?? ""),
      phone: String(data.get("phone") ?? ""),
      fulfillment,
      paymentMethod: "cod",
      ...(fulfillment === "delivery"
        ? {
            area: String(data.get("area") ?? ""),
            address: String(data.get("address") ?? ""),
          }
        : {}),
      notes: String(data.get("notes") ?? ""),
      items: lines.map(({ itemId, quantity }) => ({ itemId, quantity })),
      expectedTotalPaisa: total,
    };
    const body = JSON.stringify(input);
    if (attempt.current?.body !== body)
      attempt.current = { body, key: crypto.randomUUID() };
    setSubmitting(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, idempotencyKey: attempt.current.key }),
        signal: AbortSignal.timeout(20000),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error ?? "We couldn't send your order. Please try again.",
        );
      setReceipt(result.order);
      saveCart([]);
      attempt.current = null;
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Connection lost. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ShopContext value={{ storefront, count, addItem, openBag }}>
      {children}
      <div
        className={`toast ${toast ? "toast-visible" : ""}`}
        role="status"
        aria-live="polite"
      >
        <Check size={18} />
        {toast && t(...toast)}
      </div>
      {count > 0 && (
        <button className="mobile-bag" onClick={openBag}>
          <span>
            <ShoppingBag size={19} /> {t("View your bag", "اپنا بیگ دیکھیں")} <b>{count}</b>
          </span>
          <span>
            <bdi dir="ltr">{formatPrice(subtotal)}</bdi> <ArrowRight size={18} />
          </span>
        </button>
      )}
      <dialog
        ref={dialog}
        className="bag-dialog"
        aria-labelledby="bag-title"
        onCancel={(event) => {
          if (submitting) event.preventDefault();
          else setPanel(null);
        }}
        onClose={() => setPanel(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget && !submitting)
            setPanel(null);
        }}
      >
        <div className="bag-inner">
          <div className="bag-heading">
            <div>
              <span className="eyebrow">{t("A LITTLE HAPPINESS, TO GO", "کچھ خوشیاں، آپ کے ساتھ")}</span>
              <h2 id="bag-title">
                {receipt
                  ? t("Order received.", "آرڈر موصول ہو گیا۔")
                  : panel === "checkout"
                    ? t("Almost at the table.", "آرڈر کی تفصیلات مکمل کریں۔")
                    : t("Your good-food bag.", "آپ کا کھانے کا بیگ۔")}
              </h2>
            </div>
            <button
              className="icon-button"
              aria-label={t("Close bag", "بیگ بند کریں")}
              disabled={submitting}
              onClick={() => setPanel(null)}
            >
              <X />
            </button>
          </div>
          {receipt ? (
            <div className="order-success">
              <CheckCircle2 size={58} />
              <h3>{t("Thank you, from Mehria.", "مہریہ کی جانب سے شکریہ۔")}</h3>
              <p>
                {receipt.status === "pending"
                  ? t("Your order request has been saved. The restaurant still needs to confirm availability and preparation time.", "آپ کے آرڈر کی درخواست محفوظ ہو گئی ہے۔ دستیابی اور تیاری کے وقت کی تصدیق ریستوران کرے گا۔")
                  : t("Your saved order is shown below with its latest returned status. For questions or changes, please call the restaurant with your reference.", "آپ کا محفوظ شدہ آرڈر اور اس کی موصول شدہ تازہ کیفیت نیچے درج ہے۔ کسی سوال یا تبدیلی کے لیے اپنا حوالہ نمبر بتا کر ریستوران کو فون کریں۔")}
              </p>
              <div className="receipt">
                <span>{t("Order reference", "آرڈر کا حوالہ نمبر")}</span>
                <strong><bdi dir="ltr">{receipt.reference}</bdi></strong>
                <span>{t("Status", "آرڈر کی کیفیت")}</span>
                <strong>{t(...statusLabels[receipt.status])}</strong>
                <span>{t("Order total", "آرڈر کی کُل رقم")}</span>
                <strong><bdi dir="ltr">{formatPrice(receipt.totalPaisa)}</bdi></strong>
                <span>{t("Payment method", "ادائیگی کا طریقہ")}</span>
                <strong>{fulfillment === "pickup" ? t("Cash at pickup (COD)", "وصولی پر نقد ادائیگی (COD)") : t("Cash on delivery (COD)", "ڈیلیوری پر نقد ادائیگی (COD)")}</strong>
              </div>
              <p className="small-copy">
                {t("No online payment has been taken. Please keep your order reference.", "کوئی آن لائن ادائیگی نہیں لی گئی۔ براہِ کرم آرڈر کا حوالہ نمبر محفوظ رکھیں۔")}{" "}
                <a href={`tel:${business.phone}`}><bdi dir="ltr">{business.displayPhone}</bdi></a>
              </p>
              <button className="button primary" onClick={() => setPanel(null)}>
                {t("Back to the good stuff", "واپس مینو کی طرف")} <ArrowRight size={18} />
              </button>
            </div>
          ) : panel === "bag" ? (
            <>
              {count === 0 ? (
                <div className="empty-bag">
                  <ShoppingBag size={54} strokeWidth={1} />
                  <h3>{t("Something delicious is missing.", "بیگ میں کچھ لذیذ شامل کریں۔")}</h3>
                  <p>
                    {t("Find your favourite, add a little extra, and make a meal of it.", "اپنا پسندیدہ پکوان چنیں، کچھ لوازمات شامل کریں اور کھانے کا لطف اٹھائیں۔")}
                  </p>
                  <Link
                    href="/menu"
                    className="button primary"
                    onClick={() => setPanel(null)}
                  >
                    {t("Explore the menu", "مینو دیکھیں")} <ArrowRight size={18} />
                  </Link>
                </div>
              ) : (
                <>
                  <div className="bag-lines">
                    {lines.map(({ item, quantity, itemId }) => (
                      <div className="bag-line" key={itemId}>
                        <div className="bag-item-image">
                          <Image
                            src={item.image}
                            alt={isUr && item.nameUr ? `${item.nameUr}، مینو کی تصویر` : item.imageAlt}
                            fill
                            sizes="80px"
                          />
                        </div>
                        <div className="bag-item-copy">
                          <h3>{isUr ? item.nameUr || item.name : item.name}</h3>
                          <span>
                            {!item.available
                              ? t("Currently unavailable", "فی الحال دستیاب نہیں")
                              : <bdi dir="ltr">{formatPrice(item.pricePaisa)}</bdi>}
                          </span>
                          <div className="quantity-control">
                            <button
                              aria-label={t(`Decrease ${item.name}`, `${item.nameUr || item.name} کی تعداد کم کریں`)}
                              onClick={() =>
                                changeQuantity(itemId, quantity - 1)
                              }
                            >
                              <Minus size={14} />
                            </button>
                            <span>{quantity}</span>
                            <button
                              aria-label={t(`Increase ${item.name}`, `${item.nameUr || item.name} کی تعداد بڑھائیں`)}
                              disabled={quantity >= 20 || count >= 50}
                              onClick={() =>
                                changeQuantity(itemId, quantity + 1)
                              }
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="line-end">
                          <strong>
                            <bdi dir="ltr">{formatPrice(item.pricePaisa * quantity)}</bdi>
                          </strong>
                          <button
                            aria-label={t(`Remove ${item.name}`, `${item.nameUr || item.name} بیگ سے نکالیں`)}
                            className="icon-button"
                            onClick={() => changeQuantity(itemId, 0)}
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {unavailable && (
                    <p className="form-error" role="alert">
                      {t("Please remove unavailable items before checkout.", "آرڈر مکمل کرنے سے پہلے غیر دستیاب اشیا بیگ سے نکالیں۔")}
                    </p>
                  )}
                  {removedCount > 0 && (
                    <p className="small-copy">
                      {t("Some previously saved items are no longer on the menu and have been excluded.", "پہلے محفوظ کی گئی کچھ اشیا اب مینو میں نہیں ہیں، اس لیے انہیں شامل نہیں کیا گیا۔")}
                    </p>
                  )}
                  <div className="bag-bottom">
                    <div className="total-line">
                      <span>{t("Subtotal", "اشیا کی کُل رقم")}</span>
                      <strong><bdi dir="ltr">{formatPrice(subtotal)}</bdi></strong>
                    </div>
                    <p className="small-copy">
                      {storefront.mode !== "live"
                        ? t("Reference prices only. No payment is taken in preview.", "یہ قیمتیں صرف حوالے کے لیے ہیں۔ پیش نظارے میں کوئی ادائیگی نہیں لی جاتی۔")
                        : t("Final total and any delivery charge shown at checkout.", "حتمی رقم اور ڈیلیوری چارج آرڈر مکمل کرتے وقت دکھایا جائے گا۔")}
                    </p>
                    <button
                      className="button primary full-width"
                      disabled={unavailable}
                      onClick={() => setPanel("checkout")}
                    >
                      {t("Continue to checkout", "آرڈر مکمل کرنے کی طرف")} <ArrowRight size={18} />
                    </button>
                    <button
                      className="text-button continue-shopping"
                      onClick={() => setPanel(null)}
                    >
                      {t("A little more browsing", "مزید پکوان دیکھیں")}
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            <form method="post" className="checkout-form" onSubmit={submitOrder}>
              <button
                type="button"
                className="text-button back-to-bag"
                disabled={submitting}
                onClick={() => setPanel("bag")}
              >
                <ArrowLeft size={16} /> {t("Back to your bag", "واپس اپنے بیگ میں")}
              </button>
              {!storefront.orderingEnabled && (
                <div className="preview-notice">
                  <Info size={20} />
                  <div>
                    <strong>
                      {storefront.mode === "live"
                        ? t("Direct ordering is currently paused", "ویب سائٹ سے آرڈر فی الحال بند ہیں")
                        : storefront.mode === "unavailable"
                          ? t("Direct ordering is temporarily unavailable", "ویب سائٹ سے آرڈر عارضی طور پر دستیاب نہیں")
                          : t("You're exploring a website preview", "آپ ویب سائٹ کا پیش نظارہ دیکھ رہے ہیں")}
                    </strong>
                    <p>
                      {storefront.mode === "live"
                        ? t("Your bag is not an order. The approved menu is available to browse, but the restaurant is not accepting direct orders right now. Please call to check availability or visit its Foodpanda listing.", "آپ کا بیگ آرڈر نہیں ہے۔ منظور شدہ مینو دیکھا جا سکتا ہے، لیکن ریستوران فی الحال ویب سائٹ سے آرڈر نہیں لے رہا۔ دستیابی فون پر معلوم کریں یا فوڈ پانڈا کی فہرست دیکھیں۔")
                        : t("Your bag is not an order. Direct ordering is not enabled, and these platform reference prices need restaurant approval. You can order through the existing Foodpanda listing instead.", "آپ کا بیگ آرڈر نہیں ہے۔ ویب سائٹ سے آرڈر فعال نہیں اور ان حوالہ جاتی قیمتوں کے لیے ریستوران کی منظوری ضروری ہے۔ آپ موجودہ فوڈ پانڈا فہرست کے ذریعے آرڈر کر سکتے ہیں۔")}
                    </p>
                    <a
                      href={business.foodpanda}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t("Order on Foodpanda", "فوڈ پانڈا پر آرڈر کریں")} <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              )}
              <fieldset disabled={submitting}>
                <legend>{t("How would you like your meal?", "آپ کھانا کیسے لینا چاہیں گے؟")}</legend>
                <div className="fulfillment-options">
                  <label className={fulfillment === "pickup" ? "selected" : ""}>
                    <input
                      type="radio"
                      name="fulfillment"
                      value="pickup"
                      checked={fulfillment === "pickup"}
                      onChange={() => setFulfillment("pickup")}
                    />
                    <ShoppingBag size={22} />
                    <span>
                      {t("Pickup", "خود وصول کریں")}<small>{t("G-11 Markaz", "جی الیون مرکز")}</small>
                    </span>
                  </label>
                  <label
                    className={`${fulfillment === "delivery" ? "selected" : ""} ${!storefront.deliveryAreas.length ? "option-disabled" : ""}`}
                  >
                    <input
                      type="radio"
                      name="fulfillment"
                      value="delivery"
                      disabled={!storefront.deliveryAreas.length}
                      checked={fulfillment === "delivery"}
                      onChange={() => setFulfillment("delivery")}
                    />
                    <Truck size={22} />
                    <span>
                      {t("Delivery", "ڈیلیوری")}
                      <small>
                        {storefront.deliveryAreas.length
                          ? t("Selected areas", "منتخب علاقوں میں")
                          : t("Not enabled yet", "ابھی دستیاب نہیں")}
                      </small>
                    </span>
                  </label>
                </div>
              </fieldset>
              <div className="pickup-note">
                <MapPin size={17} />
                <span>{t(`${business.address}, Islamabad`, "الغفار پلازہ، جی الیون مرکز، اسلام آباد")}</span>
              </div>
              <label className="field">
                {t("Your name", "آپ کا نام")}
                <input
                  name="customerName"
                  autoComplete="name"
                  placeholder={t("Full name", "پورا نام")}
                  minLength={2}
                  maxLength={80}
                  required
                  disabled={submitting}
                />
              </label>
              <label className="field">
                {t("Mobile number", "موبائل نمبر")}
                <input
                  name="phone"
                  type="tel"
                  dir="ltr"
                  autoComplete="tel"
                  placeholder="03XX XXXXXXX"
                  maxLength={24}
                  required
                  disabled={submitting}
                />
                <small>{t("A Pakistani mobile number for order confirmation.", "آرڈر کی تصدیق کے لیے پاکستانی موبائل نمبر درج کریں۔")}</small>
              </label>
              {fulfillment === "delivery" && (
                <>
                  <label className="field">
                    {t("Delivery area", "ڈیلیوری کا علاقہ")}
                    <select name="area" required disabled={submitting}>
                      <option value="">{t("Choose your area", "اپنا علاقہ منتخب کریں")}</option>
                      {storefront.deliveryAreas.map((area) => (
                        <option key={area}>{area}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    {t("Complete delivery address", "ڈیلیوری کا مکمل پتہ")}
                    <textarea
                      name="address"
                      autoComplete="street-address"
                      minLength={10}
                      maxLength={300}
                      placeholder={t("House, street, sector and a nearby landmark", "مکان، گلی، سیکٹر اور قریبی مشہور جگہ")}
                      required
                      disabled={submitting}
                    />
                  </label>
                </>
              )}
              <label className="field">
                {t("Anything we should know?", "کوئی خاص ہدایت؟")}{" "}
                <span className="optional">{t("(optional)", "(اختیاری)")}</span>
                <textarea
                  name="notes"
                  maxLength={500}
                  placeholder={t("Order notes. Please call us about food allergies before ordering.", "آرڈر کی ہدایات۔ کھانے سے الرجی کی صورت میں آرڈر سے پہلے ہمیں فون کریں۔")}
                  disabled={submitting}
                />
              </label>
              <div className="checkout-summary">
                <div>
                  <span>
                    {t(`${count} item${count !== 1 ? "s" : ""}`, `${count} اشیا`)}
                  </span>
                  <strong><bdi dir="ltr">{formatPrice(subtotal)}</bdi></strong>
                </div>
                {fulfillment === "delivery" && (
                  <div>
                    <span>{t("Delivery", "ڈیلیوری")}</span>
                    <strong><bdi dir="ltr">{formatPrice(delivery)}</bdi></strong>
                  </div>
                )}
                <div className="total-line">
                  <span>{t("Total", "کُل رقم")}</span>
                  <strong><bdi dir="ltr">{formatPrice(total)}</bdi></strong>
                </div>
                <p>
                  {t("Payment:", "ادائیگی:")}{" "}
                  {fulfillment === "pickup"
                    ? t("Cash at pickup (COD)", "وصولی پر نقد ادائیگی (COD)")
                    : t("Cash on delivery (COD)", "ڈیلیوری پر نقد ادائیگی (COD)")}
                  {t(". Cash only. No online payment or card details required.", "۔ صرف نقد ادائیگی۔ آن لائن ادائیگی یا کارڈ کی معلومات درکار نہیں۔")}
                </p>
              </div>
              {error && (
                <p className="form-error" role="alert">
                  {t(error, "آرڈر نہیں بھیجا جا سکا۔ اپنی تفصیلات، مینو کی دستیابی اور انٹرنیٹ کنکشن چیک کر کے دوبارہ کوشش کریں۔ ضرورت ہو تو ریستوران کو فون کریں۔")}
                </p>
              )}
              <button
                className="button primary full-width"
                type="submit"
                disabled={
                  !storefront.orderingEnabled ||
                  submitting ||
                  unavailable ||
                  !count
                }
              >
                {submitting ? (
                  <>
                    <LoaderCircle className="spin" size={18} /> {t("Sending your order", "آرڈر بھیجا جا رہا ہے")}
                  </>
                ) : storefront.orderingEnabled ? (
                  <>
                    {t("Place order request", "آرڈر کی درخواست بھیجیں")} <ArrowRight size={18} />
                  </>
                ) : (
                  storefront.mode === "live" ? t("Direct ordering paused", "ویب سائٹ سے آرڈر بند ہیں") : t("Direct ordering not enabled", "ویب سائٹ سے آرڈر فعال نہیں")
                )}
              </button>
              <p className="small-copy">
                {t("When ordering is enabled, your details are used to process and confirm your order.", "آرڈر فعال ہونے پر آپ کی تفصیلات آرڈر تیار کرنے اور تصدیق کے لیے استعمال ہوتی ہیں۔")}{" "}
                <Link href="/privacy" onClick={() => setPanel(null)}>{t("Privacy information", "رازداری کی معلومات")}</Link>
              </p>
            </form>
          )}
        </div>
      </dialog>
    </ShopContext>
  );
}
