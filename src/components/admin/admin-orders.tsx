"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Banknote,
  Bell,
  BellOff,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Inbox,
  MapPin,
  PackageCheck,
  Phone,
  Printer,
  RefreshCw,
  Search,
  ShoppingBag,
  Truck,
  X,
} from "lucide-react";
import type { AdminOrder, AdminOrdersData } from "@/lib/admin-types";
import type { OrderStatus } from "@/lib/types";
import {
  adminError,
  adminRequest,
  orderTime,
  statusLabels,
} from "@/lib/admin-client";
import { formatPrice } from "@/lib/format";
import { useLanguage } from "../language-provider";
import { useAdmin } from "./admin-shell";
import { AdminDialog } from "./admin-dialog";

export function StatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useLanguage();
  return (
    <span className={`admin-status status-${status}`}>
      <i />
      {t(...statusLabels[status])}
    </span>
  );
}

function demoOrders(): AdminOrdersData {
  const statuses: OrderStatus[] = [
    "pending",
    "confirmed",
    "preparing",
    "ready",
  ];
  const orders = statuses.map((status, index): AdminOrder => ({
    id: `demo-${index}`,
    reference: `DEMO-100${index + 1}`,
    customerName: `Sample Customer ${index + 1}`,
    phone: "Not a real phone",
    fulfillment: index % 2 ? "pickup" : "delivery",
    area: index % 2 ? null : "Sample delivery area",
    address:
      index % 2 ? null : "Example address. Not a real customer location.",
    notes: index === 0 ? "Demonstration order only." : null,
    status,
    paymentMethod: "cod",
    paymentStatus: "unpaid",
    subtotalPaisa: 136000,
    deliveryFeePaisa: index % 2 ? 0 : 10000,
    totalPaisa: index % 2 ? 136000 : 146000,
    createdAt: "2026-11-09T08:10:00Z",
    updatedAt: "2026-11-09T08:10:00Z",
    version: 1,
    items: [
      {
        itemId: "chicken-pulao",
        name: "Chicken Pulao with Shami",
        quantity: 2,
        unitPricePaisa: 68000,
        lineTotalPaisa: 136000,
      },
    ],
  }));
  return {
    orders,
    total: orders.length,
    page: 1,
    pageSize: 20,
    stats: { newCount: 1, activeCount: 4, todayCount: 4, todayRevenuePaisa: 0 },
    generatedAt: "2026-11-09T08:10:00Z",
  };
}

export function AdminOrders({ preview = false }: { preview?: boolean }) {
  const { session } = useAdmin();
  const { t, language, isUr } = useLanguage();
  const [data, setData] = useState<AdminOrdersData | null>(() =>
    preview ? demoOrders() : null,
  );
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<AdminOrder | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [cashReceived, setCashReceived] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [sound, setSound] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const soundEnabled = useRef(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    if (preview) return;
    const controller = new AbortController();
    let inFlight = false;
    let known: Set<string> | null = null;
    async function load() {
      if (inFlight || document.hidden || controller.signal.aborted) return;
      inFlight = true;
      try {
        const result = await adminRequest<AdminOrdersData>(
          `orders?status=${encodeURIComponent(status)}&search=${encodeURIComponent(search)}&page=${page}`,
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        if (
          known &&
          result.orders.some(
            (order) => order.status === "pending" && !known!.has(order.id),
          )
        ) {
          setNotice(
            isUr ? "نیا آرڈر موصول ہوا ہے۔" : "A new order has arrived.",
          );
          if (soundEnabled.current && audio.current?.state === "running") {
            const oscillator = audio.current.createOscillator();
            const gain = audio.current.createGain();
            oscillator.connect(gain);
            gain.connect(audio.current.destination);
            oscillator.frequency.value = 740;
            gain.gain.setValueAtTime(0.1, audio.current.currentTime);
            gain.gain.exponentialRampToValueAtTime(
              0.001,
              audio.current.currentTime + 0.4,
            );
            oscillator.start();
            oscillator.stop(audio.current.currentTime + 0.4);
          }
        }
        known = new Set(result.orders.map((order) => order.id));
        setData(result);
        setError("");
      } catch (caught) {
        if (!controller.signal.aborted) setError(adminError(caught, isUr));
      } finally {
        inFlight = false;
      }
    }
    void load();
    const timer = setInterval(load, 15000);
    const onVisible = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      controller.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [preview, status, search, page, reload, isUr]);
  useEffect(
    () => () => {
      void audio.current?.close();
    },
    [],
  );

  async function toggleSound() {
    if (!sound && typeof AudioContext !== "undefined") {
      try {
        audio.current ??= new AudioContext();
        await audio.current.resume();
        soundEnabled.current = true;
        setSound(true);
      } catch {
        setNotice(
          t(
            "Your browser could not enable sound. Keep checking the queue.",
            "براؤزر آواز فعال نہیں کر سکا۔ آرڈر باقاعدگی سے چیک کریں۔",
          ),
        );
      }
    } else {
      soundEnabled.current = false;
      setSound(false);
    }
  }

  const nextStatus: OrderStatus | null = selected
    ? (
        {
          pending: "confirmed",
          confirmed: "preparing",
          preparing: "ready",
          ready:
            selected.fulfillment === "delivery"
              ? "out_for_delivery"
              : "completed",
          out_for_delivery: "completed",
          completed: null,
          cancelled: null,
        } as Record<OrderStatus, OrderStatus | null>
      )[selected.status]
    : null;
  async function updateOrder(next: OrderStatus) {
    if (!selected || !session || preview) return;
    setSaving(true);
    setActionError("");
    try {
      const result = await adminRequest<{ order: AdminOrder }>(
        `orders/${selected.id}`,
        {
          method: "PATCH",
          csrfToken: session.csrfToken,
          data: {
            status: next,
            version: selected.version,
            ...(next === "completed" ? { collectPayment: cashReceived } : {}),
          },
        },
      );
      setSelected(result.order);
      setCancelConfirm(false);
      setCashReceived(false);
      setReload((value) => value + 1);
    } catch (caught) {
      setActionError(adminError(caught, isUr));
    } finally {
      setSaving(false);
    }
  }
  function selectOrder(order: AdminOrder) {
    setSelected(order);
    setActionError("");
    setCashReceived(false);
    setCancelConfirm(false);
  }
  const orders = preview
    ? (data?.orders ?? []).filter(
        (order) =>
          (status === "all" || order.status === status) &&
          `${order.reference} ${order.customerName}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      )
    : (data?.orders ?? []);
  const stats = data?.stats;
  const steps = [
    "pending",
    "confirmed",
    "preparing",
    "ready",
    ...(selected?.fulfillment === "delivery" ? ["out_for_delivery"] : []),
    "completed",
  ] as OrderStatus[];

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="admin-kicker">
            {t("YOUR KITCHEN, AT A GLANCE", "آپ کے کچن کی ایک جھلک")}
          </span>
          <h1>{t("Good food. Smooth service.", "اچھا کھانا، بہترین خدمت۔")}</h1>
          <p>
            {t(
              "A fresh view of every order, from first hello to the last bite.",
              "ہر نئے آرڈر سے کھانا ملنے تک، تمام کام ایک جگہ دیکھیں۔",
            )}
          </p>
        </div>
        <button
          className="admin-button subtle"
          disabled={preview}
          onClick={() => setReload((value) => value + 1)}
        >
          <RefreshCw size={15} />
          {t("Refresh", "تازہ کریں")}
        </button>
      </div>
      <div className="admin-stats">
        {[
          {
            label: t("New orders", "نئے آرڈر"),
            value: stats?.newCount,
            hint: t("Waiting for your confirmation", "آپ کی تصدیق کے منتظر"),
            icon: Inbox,
            color: "rose",
          },
          {
            label: t("In the kitchen", "زیرِ تکمیل"),
            value: stats?.activeCount,
            hint: t("All active orders", "تمام فعال آرڈر"),
            icon: Clock3,
            color: "amber",
          },
          {
            label: t("Orders today", "آج کے آرڈر"),
            value: stats?.todayCount,
            hint: t("Today, Pakistan time", "پاکستان کے وقت کے مطابق"),
            icon: ShoppingBag,
            color: "blue",
          },
          {
            label: t("Cash collected today", "آج وصول شدہ نقد رقم"),
            value: stats ? formatPrice(stats.todayRevenuePaisa) : undefined,
            hint: t("Completed and paid orders only", "صرف مکمل، ادا شدہ آرڈر"),
            icon: Banknote,
            color: "green",
          },
        ].map(({ label, value, hint, icon: Icon, color }) => (
          <div className="admin-stat" key={label}>
            <div>
              <span>{label}</span>
              <span className={`stat-icon ${color}`}>
                <Icon size={20} />
              </span>
            </div>
            <strong dir="ltr">{value ?? "--"}</strong>
            <small>{hint}</small>
          </div>
        ))}
      </div>
      {error && (
        <div className="admin-alert error" role="alert">
          {error}
          <button onClick={() => setReload((value) => value + 1)}>
            {t("Try again", "دوبارہ کوشش کریں")}
          </button>
        </div>
      )}
      {notice && (
        <div className="admin-alert info" role="status">
          <Bell size={16} />
          {notice}
          <button
            aria-label={t("Dismiss notice", "اطلاع بند کریں")}
            onClick={() => setNotice("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      <section className="admin-panel order-panel">
        <div className="admin-panel-heading">
          <div>
            <h2>{t("The order board", "آرڈر بورڈ")}</h2>
            <p>
              {t(
                "One queue. Every little detail.",
                "ایک فہرست میں ہر ضروری تفصیل۔",
              )}
            </p>
          </div>
          <div className="order-live-tools">
            <span
              className={`admin-live-indicator ${error ? "disconnected" : ""}`}
            >
              <i />
              {preview
                ? t("Demo data", "نمونہ معلومات")
                : error
                  ? t("Connection interrupted", "رابطہ منقطع")
                  : t(
                      "Refreshes every 15 seconds",
                      "ہر 15 سیکنڈ بعد تازہ ہوتا ہے",
                    )}
            </span>
            <button
              className={`admin-button small ${sound ? "subtle" : "ghost"}`}
              onClick={toggleSound}
              disabled={preview}
              aria-pressed={sound}
            >
              {sound ? <Bell size={15} /> : <BellOff size={15} />}
              {t(
                sound ? "Sound on" : "Enable sound",
                sound ? "آواز فعال" : "آواز فعال کریں",
              )}
            </button>
          </div>
        </div>
        <div className="admin-order-tools">
          <div
            className="admin-filters"
            role="group"
            aria-label={t("Filter orders", "آرڈر فلٹر کریں")}
          >
            <button
              className={status === "all" ? "active" : ""}
              onClick={() => {
                setStatus("all");
                setPage(1);
              }}
            >
              {t("All orders", "تمام آرڈر")}
            </button>
            {(
              ["pending", "preparing", "ready", "completed"] as OrderStatus[]
            ).map((value) => (
              <button
                key={value}
                className={status === value ? "active" : ""}
                onClick={() => {
                  setStatus(value);
                  setPage(1);
                }}
              >
                {t(...statusLabels[value])}
              </button>
            ))}
            <select
              aria-label={t("More order statuses", "مزید آرڈر کی حالتیں")}
              value={
                ["confirmed", "out_for_delivery", "cancelled"].includes(status)
                  ? status
                  : ""
              }
              onChange={(event) => {
                setStatus(event.target.value || "all");
                setPage(1);
              }}
            >
              <option value="">{t("More", "مزید")}</option>
              {(
                ["confirmed", "out_for_delivery", "cancelled"] as OrderStatus[]
              ).map((value) => (
                <option value={value} key={value}>
                  {t(...statusLabels[value])}
                </option>
              ))}
            </select>
          </div>
          <label className="admin-search">
            <Search size={17} />
            <input
              placeholder={t(
                "Search name or order...",
                "نام یا آرڈر تلاش کریں",
              )}
              aria-label={t("Search orders", "آرڈر تلاش کریں")}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              maxLength={100}
            />
          </label>
        </div>
        <div className="admin-order-table">
          <table>
            <thead>
              <tr>
                <th>{t("Order / time", "آرڈر / وقت")}</th>
                <th>{t("Customer", "گاہک")}</th>
                <th>{t("Fulfilment", "حصول کا طریقہ")}</th>
                <th>{t("Total", "کل رقم")}</th>
                <th>{t("Status", "حالت")}</th>
                <th>
                  <span className="sr-only">
                    {t("View order", "آرڈر دیکھیں")}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <button
                      className="order-reference"
                      onClick={() => selectOrder(order)}
                      dir="ltr"
                    >
                      {order.reference}
                    </button>
                    <small>{orderTime(order.createdAt, language, true)}</small>
                  </td>
                  <td>
                    <strong>
                      {preview
                        ? t(
                            order.customerName,
                            `نمونہ گاہک ${Number(order.id.slice(-1)) + 1}`,
                          )
                        : order.customerName}
                    </strong>
                    <small>
                      {order.items.reduce(
                        (sum, item) => sum + item.quantity,
                        0,
                      )}{" "}
                      {t("items", "اشیا")}
                    </small>
                  </td>
                  <td>
                    <span className="fulfilment-label">
                      {order.fulfillment === "delivery" ? (
                        <Truck size={16} />
                      ) : (
                        <ShoppingBag size={16} />
                      )}
                      {t(
                        order.fulfillment === "delivery"
                          ? "Delivery"
                          : "Pickup",
                        order.fulfillment === "delivery" ? "ڈیلیوری" : "پک اَپ",
                      )}
                    </span>
                    <small>{order.area ?? "G-11 Markaz"}</small>
                  </td>
                  <td>
                    <strong dir="ltr">{formatPrice(order.totalPaisa)}</strong>
                    <small className="cash-label">
                      <Banknote size={12} />
                      {t(
                        order.paymentStatus === "collected"
                          ? "Cash collected"
                          : "COD · unpaid",
                        order.paymentStatus === "collected"
                          ? "نقد رقم وصول"
                          : "نقد · غیر ادا شدہ",
                      )}
                    </small>
                  </td>
                  <td>
                    <StatusBadge status={order.status} />
                  </td>
                  <td>
                    <button
                      className="order-view-button"
                      aria-label={`${t("View order", "آرڈر دیکھیں")} ${order.reference}`}
                      onClick={() => selectOrder(order)}
                    >
                      <ArrowUpRight size={19} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="admin-order-cards">
          {orders.map((order) => <button key={order.id} className="admin-order-card" onClick={() => selectOrder(order)} aria-label={`${t("View order", "آرڈر دیکھیں")} ${order.reference}`}>
            <span className="order-card-top"><strong dir="ltr">{order.reference}</strong><StatusBadge status={order.status} /></span>
            <span className="order-card-customer">{preview ? t(order.customerName, `نمونہ گاہک ${Number(order.id.slice(-1)) + 1}`) : order.customerName}<small>{orderTime(order.createdAt, language, true)}</small></span>
            <span className="order-card-bottom"><span>{order.fulfillment === "delivery" ? <Truck size={16} /> : <ShoppingBag size={16} />}{t(order.fulfillment === "delivery" ? "Delivery" : "Pickup", order.fulfillment === "delivery" ? "ڈیلیوری" : "پک اَپ")}<small>{t(order.paymentStatus === "collected" ? "Cash collected" : "COD · unpaid", order.paymentStatus === "collected" ? "رقم وصول ہو گئی" : "نقد · غیر ادا شدہ")}</small></span><strong dir="ltr">{formatPrice(order.totalPaisa)}<ArrowUpRight size={17} /></strong></span>
          </button>)}
        </div>
        {!data && !error && (
          <div className="admin-empty">
            <RefreshCw size={28} className="spin" />
            <h3>
              {t(
                "Getting the kitchen ready...",
                "کچن کی معلومات حاصل ہو رہی ہیں۔",
              )}
            </h3>
          </div>
        )}
        {data && !orders.length && (
          <div className="admin-empty">
            <span>
              <Inbox size={36} strokeWidth={1.4} />
            </span>
            <h3>{t("A little quiet, for now.", "ابھی کوئی آرڈر نہیں۔")}</h3>
            <p>
              {t(
                "New orders will appear here. Keep this screen open while the kitchen is taking orders.",
                "نئے آرڈر یہاں ظاہر ہوں گے۔ آرڈر وصول کرتے وقت یہ اسکرین کھلی رکھیں۔",
              )}
            </p>
          </div>
        )}
        <div className="admin-table-footer">
          <span>
            {preview
              ? t("Sample orders only", "صرف نمونہ آرڈر")
              : data
                ? `${data.total} ${t("orders", "آرڈر")} · ${t("Last refreshed", "آخری تازہ کاری")} ${orderTime(data.generatedAt, language)}`
                : t("Connecting to your store", "اسٹور سے رابطہ جاری ہے")}
          </span>
          <div>
            <button
              aria-label={t("Previous page", "پچھلا صفحہ")}
              className="admin-icon-button"
              disabled={page <= 1 || preview}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft size={17} />
            </button>
            <span>
              {t("Page", "صفحہ")} {page}
            </span>
            <button
              aria-label={t("Next page", "اگلا صفحہ")}
              className="admin-icon-button"
              disabled={!data || page * data.pageSize >= data.total || preview}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </section>
      <div className="admin-bottom-notes">
        <div>
          <Banknote size={22} />
          <p>
            <strong>
              {t(
                "Cash is the only payment method.",
                "صرف نقد ادائیگی دستیاب ہے۔",
              )}
            </strong>
            <span>
              {t(
                "Always collect the full amount before completing an order.",
                "آرڈر مکمل کرنے سے پہلے پوری رقم وصول کریں۔",
              )}
            </span>
          </p>
        </div>
        <div>
          <Clock3 size={22} />
          <p>
            <strong>
              {t("Keep the kitchen connected.", "کچن کا رابطہ برقرار رکھیں۔")}
            </strong>
            <span>
              {t(
                "Sound works while this screen is active. A closed app cannot receive live alerts.",
                "آواز اسکرین کھلی ہونے پر کام کرتی ہے۔ بند ایپ میں لائیو الرٹ نہیں آتے۔",
              )}
            </span>
          </p>
        </div>
      </div>
      <AdminDialog
        open={!!selected}
        title={selected?.reference ?? t("Order details", "آرڈر کی تفصیل")}
        busy={saving}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <div className="order-details">
            <div className="order-detail-meta">
              <StatusBadge status={selected.status} />
              <span>{orderTime(selected.createdAt, language, true)}</span>
              <button
                className="admin-button small ghost print-trigger"
                disabled={preview}
                onClick={() => window.print()}
              >
                <Printer size={15} />
                {t("Print receipt", "رسید پرنٹ کریں")}
              </button>
            </div>
            <div className="order-progress">
              {steps.map((step, index) => (
                <div
                  key={step}
                  className={
                    selected.status !== "cancelled" &&
                    index <= steps.indexOf(selected.status)
                      ? "reached"
                      : ""
                  }
                >
                  <span>
                    {index < steps.indexOf(selected.status) ? (
                      <Check size={12} />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <small>{t(...statusLabels[step])}</small>
                </div>
              ))}
            </div>
            <div className="order-customer">
              <h3>{selected.customerName}</h3>
              {!preview && (
                <a href={`tel:${selected.phone}`} dir="ltr">
                  <Phone size={14} />
                  {selected.phone}
                </a>
              )}
              <p>
                <MapPin size={15} />
                {selected.fulfillment === "delivery"
                  ? `${selected.area}, ${selected.address}`
                  : t("Pickup at G-11 Markaz", "جی الیون مرکز سے پک اَپ")}
              </p>
            </div>
            <h4>{t("In this order", "اس آرڈر میں")}</h4>
            <div className="receipt-items">
              {selected.items.map((item) => (
                <div key={item.itemId}>
                  <span>
                    <b>{item.quantity}×</b>
                    {item.name}
                  </span>
                  <strong dir="ltr">{formatPrice(item.lineTotalPaisa)}</strong>
                </div>
              ))}
            </div>
            {selected.notes && (
              <p className="order-notes">
                <strong>{t("Customer note", "گاہک کی ہدایت")}</strong>
                {selected.notes}
              </p>
            )}
            <div className="order-totals">
              <div>
                <span>{t("Subtotal", "اشیا کی رقم")}</span>
                <strong dir="ltr">{formatPrice(selected.subtotalPaisa)}</strong>
              </div>
              <div>
                <span>{t("Delivery fee", "ڈیلیوری فیس")}</span>
                <strong dir="ltr">
                  {formatPrice(selected.deliveryFeePaisa)}
                </strong>
              </div>
              <div className="grand-total">
                <span>{t("Total to collect", "وصول کی جانے والی رقم")}</span>
                <strong dir="ltr">{formatPrice(selected.totalPaisa)}</strong>
              </div>
              <p>
                <Banknote size={15} />
                {t(
                  selected.paymentStatus === "collected"
                    ? "COD · Cash received"
                    : "COD · Cash not collected",
                  selected.paymentStatus === "collected"
                    ? "نقد · رقم وصول ہو گئی"
                    : "نقد · رقم وصول نہیں ہوئی",
                )}
              </p>
            </div>
            {preview ? (
              <div className="admin-alert info">
                {t(
                  "This is a read-only sample. Set up your store to manage real orders.",
                  "یہ صرف نمونہ ہے۔ اصل آرڈر کے لیے اسٹور سیٹ اَپ کریں۔",
                )}
              </div>
            ) : (
              <div className="order-actions no-print">
                {nextStatus === "completed" && (
                  <label className="admin-check cash-confirm">
                    <input
                      type="checkbox"
                      checked={cashReceived}
                      onChange={(event) =>
                        setCashReceived(event.target.checked)
                      }
                    />
                    <span>
                      {t(
                        "I have received the full cash amount.",
                        "میں نے پوری نقد رقم وصول کر لی ہے۔",
                      )}{" "}
                      <strong dir="ltr">
                        {formatPrice(selected.totalPaisa)}
                      </strong>
                    </span>
                  </label>
                )}
                {actionError && (
                  <p className="admin-alert error" role="alert">
                    {actionError}
                  </p>
                )}
                {nextStatus && (
                  <button
                    className="admin-button solid wide"
                    disabled={
                      saving || (nextStatus === "completed" && !cashReceived)
                    }
                    onClick={() => updateOrder(nextStatus)}
                  >
                    {saving ? (
                      <RefreshCw size={17} className="spin" />
                    ) : nextStatus === "completed" ? (
                      <CheckCircle2 size={18} />
                    ) : (
                      <PackageCheck size={18} />
                    )}
                    {t(
                      nextStatus === "confirmed"
                        ? "Confirm order"
                        : nextStatus === "preparing"
                          ? "Start preparing"
                          : nextStatus === "ready"
                            ? "Mark as ready"
                            : nextStatus === "out_for_delivery"
                              ? "Send out for delivery"
                              : "Cash received · complete order",
                      nextStatus === "confirmed"
                        ? "آرڈر کی تصدیق کریں"
                        : nextStatus === "preparing"
                          ? "تیاری شروع کریں"
                          : nextStatus === "ready"
                            ? "تیار ہونے کا نشان لگائیں"
                            : nextStatus === "out_for_delivery"
                              ? "ڈیلیوری کے لیے بھیجیں"
                              : "رقم وصول · آرڈر مکمل کریں",
                    )}
                    <ArrowRight size={17} />
                  </button>
                )}
                {selected.status !== "completed" &&
                  selected.status !== "cancelled" &&
                  (cancelConfirm ? (
                    <div className="cancel-confirm">
                      <p>
                        {t(
                          "Cancel this order? This cannot be undone.",
                          "آرڈر منسوخ کریں؟ یہ واپس نہیں ہو سکتا۔",
                        )}
                      </p>
                      <button
                        disabled={saving}
                        className="admin-button danger small"
                        onClick={() => updateOrder("cancelled")}
                      >
                        {t("Yes, cancel order", "ہاں، منسوخ کریں")}
                      </button>
                      <button
                        disabled={saving}
                        className="admin-button ghost small"
                        onClick={() => setCancelConfirm(false)}
                      >
                        {t("Keep order", "آرڈر برقرار رکھیں")}
                      </button>
                    </div>
                  ) : (
                    <button
                      disabled={saving}
                      className="admin-button ghost wide"
                      onClick={() => setCancelConfirm(true)}
                    >
                      {t("Cancel this order", "یہ آرڈر منسوخ کریں")}
                    </button>
                  ))}
                {selected.status === "completed" && (
                  <p className="admin-terminal">
                    <CheckCircle2 size={20} />
                    {t(
                      "Completed. Cash has been recorded.",
                      "مکمل۔ نقد رقم درج ہو گئی ہے۔",
                    )}
                  </p>
                )}
                {selected.status === "cancelled" && (
                  <p className="admin-terminal">
                    {t(
                      "This order is cancelled and cannot be reopened.",
                      "یہ آرڈر منسوخ ہے اور دوبارہ نہیں کھل سکتا۔",
                    )}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </AdminDialog>
    </>
  );
}
