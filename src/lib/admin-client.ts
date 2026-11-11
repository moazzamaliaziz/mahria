import type { OrderStatus } from "./types";

export const statusLabels: Record<OrderStatus, [string, string]> = {
  pending: ["New", "نیا"],
  confirmed: ["Confirmed", "تصدیق شدہ"],
  preparing: ["Preparing", "تیار ہو رہا ہے"],
  ready: ["Ready", "تیار ہے"],
  out_for_delivery: ["Out for delivery", "ڈیلیوری کے لیے روانہ"],
  completed: ["Completed", "مکمل"],
  cancelled: ["Cancelled", "منسوخ"],
};

export class AdminClientError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function adminRequest<T>(
  path: string,
  options: {
    csrfToken?: string;
    method?: string;
    data?: unknown;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  const response = await fetch(`/api/admin/${path}`, {
    method: options.method ?? "GET",
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      ...(options.data ? { "Content-Type": "application/json" } : {}),
      ...(options.csrfToken ? { "X-CSRF-Token": options.csrfToken } : {}),
    },
    body: options.data ? JSON.stringify(options.data) : undefined,
    signal: options.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(15000)])
      : AbortSignal.timeout(15000),
  });
  const result = await response
    .json()
    .catch(() => ({ error: "The server could not complete this request." }));
  if (!response.ok) {
    if (
      response.status === 401 &&
      path !== "login" &&
      typeof window !== "undefined"
    )
      window.location.replace("/admin/login?expired=1");
    throw new AdminClientError(
      result.error ?? "Please try again.",
      response.status,
    );
  }
  return result;
}

export function adminError(error: unknown, isUr: boolean): string {
  if (isUr) {
    if (error instanceof AdminClientError) {
      if (error.status === 409)
        return "یہ معلومات کسی اور نے تبدیل کر دی ہیں۔ تازہ معلومات حاصل کریں اور دوبارہ کوشش کریں۔";
      if (error.status === 429)
        return "بہت زیادہ کوششیں ہو چکی ہیں۔ 15 منٹ انتظار کریں۔";
      if (error.status === 401)
        return "ای میل یا پاس ورڈ درست نہیں، یا سیشن ختم ہو گیا ہے۔ دوبارہ سائن اِن کریں۔";
      if (error.status === 403)
        return "سیکیورٹی کی تصدیق نہیں ہو سکی۔ صفحہ تازہ کریں یا دوبارہ سائن اِن کریں۔";
      if (error.status === 400)
        return "درج کردہ معلومات چیک کریں۔ تمام ضروری خانے درست بھریں۔";
    }
    return "سرور سے رابطہ نہیں ہو سکا۔ انٹرنیٹ اور ڈیٹابیس سیٹ اَپ چیک کریں، پھر دوبارہ کوشش کریں۔";
  }
  return error instanceof Error
    ? error.message
    : "Connection interrupted. Please try again.";
}

export function rupeesToPaisa(value: string): number | null {
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(value.trim())) return null;
  const [whole, fraction = ""] = value.trim().split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export function orderTime(
  value: string,
  language: "en" | "ur",
  includeDate = false,
) {
  return new Intl.DateTimeFormat(language === "ur" ? "ur-PK" : "en-PK", {
    timeZone: "Asia/Karachi",
    hour: "numeric",
    minute: "2-digit",
    ...(includeDate ? ({ day: "numeric", month: "short" } as const) : {}),
  }).format(new Date(value));
}
