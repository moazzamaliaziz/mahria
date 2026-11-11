import { createHash } from "node:crypto";
import { z } from "zod";
import type { CartLine, OrderInput } from "./types";

export const MAX_MONEY_PAISA = 2_147_483_647;
export const MAX_BODY_BYTES = 16 * 1024;
export const ORDER_RATE_LIMIT = 3;

export class OrderError extends Error {
  constructor(
    message: string,
    public readonly status: number = 400,
  ) {
    super(message);
    this.name = "OrderError";
  }
}

export const phoneSchema = z
  .string()
  .trim()
  .max(32)
  .regex(/^[+\d\s()-]+$/)
  .transform((value) => {
    const phone = value.replace(/[\s()-]/g, "");
    if (phone.startsWith("0092")) return `+92${phone.slice(4)}`;
    if (phone.startsWith("92")) return `+${phone}`;
    if (phone.startsWith("0")) return `+92${phone.slice(1)}`;
    return phone;
  })
  .pipe(
    z
      .string()
      .regex(
        /^\+923\d{9}$/,
        "Enter a Pakistani mobile number, such as 0300 1234567.",
      ),
  );

const singleLine = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .regex(/^[^\u0000-\u001f\u007f]*$/, "Use a single line of text.");
const multiline = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .regex(
      /^[^\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]*$/,
      "Remove unsupported control characters.",
    );

export const orderSchema = z
  .object({
    idempotencyKey: z
      .string()
      .min(16)
      .max(128)
      .regex(/^[A-Za-z0-9_-]+$/, "Invalid order request key."),
    customerName: singleLine(80).min(
      2,
      "Enter your name (at least 2 characters).",
    ),
    phone: phoneSchema,
    fulfillment: z.enum(["pickup", "delivery"]).default("pickup"),
    area: singleLine(120).optional(),
    address: multiline(300).optional(),
    notes: multiline(500).optional(),
    items: z
      .array(
        z
          .object({
            itemId: z
              .string()
              .min(1)
              .max(64)
              .regex(/^[A-Za-z0-9_-]+$/),
            quantity: z
              .number()
              .int()
              .min(1)
              .max(20, "Choose no more than 20 of each item."),
          })
          .strict(),
      )
      .min(1, "Add at least one item.")
      .max(50),
    expectedTotalPaisa: z.number().int().min(0).max(MAX_MONEY_PAISA),
    paymentMethod: z.literal("cod").default("cod"),
  })
  .strict()
  .superRefine((order, context) => {
    if (
      new Set(order.items.map((line) => line.itemId)).size !==
      order.items.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["items"],
        message: "Each menu item can appear only once.",
      });
    }
    if (order.items.reduce((sum, line) => sum + line.quantity, 0) > 50) {
      context.addIssue({
        code: "custom",
        path: ["items"],
        message: "An order may contain at most 50 items in total.",
      });
    }
    if (
      order.fulfillment === "delivery" &&
      (!order.address || order.address.length < 10)
    ) {
      context.addIssue({
        code: "custom",
        path: ["address"],
        message: "Enter a complete delivery address (10 to 300 characters).",
      });
    }
    if (order.fulfillment === "delivery" && !order.area) {
      context.addIssue({
        code: "custom",
        path: ["area"],
        message: "Choose a delivery area.",
      });
    }
  });

export function parseOrder(input: unknown): OrderInput {
  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) {
    throw new OrderError(
      parsed.error.issues[0]?.message ?? "Check the order details.",
    );
  }
  return parsed.data;
}

export type DeliveryConfig = {
  deliveryAreas: string[];
  deliveryFeePaisa: number;
};

export function getDeliveryConfig(): DeliveryConfig {
  // Migration seed only. Live storefront and checkout read store_settings instead.
  const deliveryAreas = [
    ...new Set(
      (process.env.DELIVERY_AREAS ?? "")
        .split(",")
        .map((area) => area.trim())
        .filter(Boolean),
    ),
  ];
  const fee = process.env.DELIVERY_FEE_PAISA?.trim() || "0";
  if (
    !/^\d+$/.test(fee) ||
    !Number.isSafeInteger(Number(fee)) ||
    Number(fee) > MAX_MONEY_PAISA ||
    deliveryAreas.some(
      (area) => area.length > 120 || /[\u0000-\u001f\u007f]/.test(area),
    )
  ) {
    throw new OrderError(
      "Ordering configuration is unavailable. Please try again later.",
      503,
    );
  }
  return {
    deliveryAreas,
    deliveryFeePaisa: deliveryAreas.length ? Number(fee) : 0,
  };
}

export type PricedMenuItem = {
  id: string;
  name: string;
  pricePaisa: number;
  available: boolean;
};
export type SnapshotLine = CartLine & {
  name: string;
  unitPricePaisa: number;
  lineTotalPaisa: number;
};

export function calculateOrder(
  input: OrderInput,
  menu: PricedMenuItem[],
  delivery: DeliveryConfig,
): {
  lines: SnapshotLine[];
  subtotalPaisa: number;
  deliveryFeePaisa: number;
  totalPaisa: number;
} {
  if (
    input.fulfillment === "delivery" &&
    !delivery.deliveryAreas.includes(input.area ?? "")
  ) {
    throw new OrderError(
      "Delivery is not available for that area. Choose a listed area or pickup.",
    );
  }
  const lines = input.items.map((line) => {
    const item = menu.find(
      (entry) => entry.id === line.itemId && entry.available,
    );
    if (!item)
      throw new OrderError(
        "An item is no longer available. Refresh the menu and review your order.",
        409,
      );
    if (
      !Number.isSafeInteger(item.pricePaisa) ||
      item.pricePaisa <= 0 ||
      item.pricePaisa > MAX_MONEY_PAISA
    ) {
      throw new OrderError("Menu pricing is temporarily unavailable.", 503);
    }
    return {
      ...line,
      name: item.name,
      unitPricePaisa: item.pricePaisa,
      lineTotalPaisa: item.pricePaisa * line.quantity,
    };
  });
  const subtotalPaisa = lines.reduce(
    (total, line) => total + line.lineTotalPaisa,
    0,
  );
  const deliveryFeePaisa =
    input.fulfillment === "delivery" ? delivery.deliveryFeePaisa : 0;
  const totalPaisa = subtotalPaisa + deliveryFeePaisa;
  if (!Number.isSafeInteger(totalPaisa) || totalPaisa > MAX_MONEY_PAISA) {
    throw new OrderError(
      "This order is too large. Please reduce the quantities.",
    );
  }
  if (input.expectedTotalPaisa !== totalPaisa) {
    throw new OrderError(
      "The menu price or delivery fee has changed. Refresh the menu and review the new total before submitting again.",
      409,
    );
  }
  return { lines, subtotalPaisa, deliveryFeePaisa, totalPaisa };
}

export function hashOrder(input: OrderInput): Buffer {
  // Normalize equivalent retries, including harmless changes to cart line order.
  return createHash("sha256")
    .update(
      JSON.stringify({
        customerName: input.customerName,
        phone: input.phone,
        fulfillment: input.fulfillment,
        area: input.area || null,
        address: input.address || null,
        notes: input.notes || null,
        items: [...input.items]
          .sort((a, b) => a.itemId.localeCompare(b.itemId))
          .map(({ itemId, quantity }) => ({ itemId, quantity })),
        expectedTotalPaisa: input.expectedTotalPaisa,
      }),
    )
    .digest();
}
