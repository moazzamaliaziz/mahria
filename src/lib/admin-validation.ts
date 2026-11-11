import { z } from "zod";
import type { OrderStatus } from "./types";

const text = (max: number) => z.string().trim().max(max).regex(/^[^\u0000-\u001f\u007f]*$/, "Use a single line without control characters.");
const paragraph = z.string().trim().max(1000).regex(/^[^\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]*$/);
export const emailSchema = z.string().trim().max(254).email().transform((value) => value.toLowerCase());
export const passwordSchema = z.string().min(1).refine((value) => Buffer.byteLength(value, "utf8") <= 1024, "Password must be at most 1024 bytes.");
export const newPasswordSchema = passwordSchema.refine((value) => [...value].length >= 12, "Use at least 12 characters.");
export const adminIdentitySchema = z.object({ name: text(120).min(2), email: emailSchema });
export const loginSchema = z.object({ email: emailSchema, password: passwordSchema }).strict();
export const passwordChangeSchema = z.object({ currentPassword: passwordSchema, newPassword: newPasswordSchema }).strict();
export const versionSchema = z.number().int().min(1).max(2_147_483_646);
export const statusSchema = z.enum(["pending", "confirmed", "preparing", "ready", "out_for_delivery", "completed", "cancelled"]);
export const orderUpdateSchema = z.object({ status: statusSchema, version: versionSchema, collectPayment: z.boolean().optional() }).strict();
export const menuUpdateSchema = z.object({
  name: text(120).min(2), nameUr: text(120), description: paragraph.min(1), descriptionUr: paragraph,
  pricePaisa: z.number().int().min(1).max(2_147_483_647),
  available: z.boolean(), approved: z.boolean(), version: versionSchema,
}).strict();
export const storeSettingsSchema = z.object({
  orderingEnabled: z.boolean(),
  deliveryAreas: z.array(text(120).min(1)).max(50).refine((areas) => new Set(areas.map((area) => area.toLowerCase())).size === areas.length, "Remove duplicate delivery areas."),
  deliveryFeePaisa: z.number().int().min(0).max(2_147_483_647), version: versionSchema,
}).strict();

export function canTransition(from: OrderStatus, to: OrderStatus, fulfillment: "pickup" | "delivery"): boolean {
  const next: Record<OrderStatus, OrderStatus[]> = {
    pending: ["confirmed", "cancelled"], confirmed: ["preparing", "cancelled"],
    preparing: ["ready", "cancelled"],
    ready: [fulfillment === "delivery" ? "out_for_delivery" : "completed", "cancelled"],
    out_for_delivery: fulfillment === "delivery" ? ["completed", "cancelled"] : [],
    completed: [], cancelled: [],
  };
  return next[from]?.includes(to) ?? false;
}

export function pakistanDayBounds(now = new Date()): { start: Date; end: Date } {
  const offset = 5 * 60 * 60 * 1000;
  const local = new Date(now.getTime() + offset);
  const start = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - offset);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}
