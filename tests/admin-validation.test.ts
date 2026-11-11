import assert from "node:assert/strict";
import { test } from "node:test";
import { canTransition, menuUpdateSchema, orderUpdateSchema, pakistanDayBounds, passwordChangeSchema, storeSettingsSchema } from "../src/lib/admin-validation";
import type { OrderStatus } from "../src/lib/types";

test("strict order lifecycle covers pickup, delivery, cancellations and terminal states", () => {
  const statuses: OrderStatus[] = ["pending", "confirmed", "preparing", "ready", "out_for_delivery", "completed", "cancelled"];
  for (const fulfillment of ["pickup", "delivery"] as const) {
    const expected = new Set(["pending:confirmed", "pending:cancelled", "confirmed:preparing", "confirmed:cancelled", "preparing:ready", "preparing:cancelled", "ready:cancelled", fulfillment === "delivery" ? "ready:out_for_delivery" : "ready:completed", ...(fulfillment === "delivery" ? ["out_for_delivery:completed", "out_for_delivery:cancelled"] : [])]);
    for (const from of statuses) for (const to of statuses) assert.equal(canTransition(from, to, fulfillment), expected.has(`${from}:${to}`), `${fulfillment} ${from}->${to}`);
  }
  assert.equal(orderUpdateSchema.safeParse({ status: "completed", version: 1, collectPayment: true }).success, true);
  for (const input of [{ status: "pending", version: 0 }, { status: "paid", version: 1 }, { status: "completed", version: 1, paymentMethod: "card" }, { status: "completed", version: 1, collectPayment: "true" }]) assert.equal(orderUpdateSchema.safeParse(input).success, false);
});

test("menu edits bound text and integer prices and cannot overwrite image/category", () => {
  const valid = { name: "Raita", nameUr: "رائتہ", description: "Fresh yogurt", descriptionUr: "تازہ دہی", pricePaisa: 6000, available: true, approved: false, version: 1 };
  assert.equal(menuUpdateSchema.safeParse(valid).success, true);
  for (const change of [{ image: "https://evil.test/x.svg" }, { category: "other" }, { name: "x".repeat(121) }, { nameUr: "\u0000" }, { descriptionUr: "x".repeat(1001) }, { pricePaisa: 0 }, { pricePaisa: 1.2 }, { pricePaisa: 2147483648 }, { version: 0 }]) assert.equal(menuUpdateSchema.safeParse({ ...valid, ...change }).success, false);
});

test("settings accept only explicit DB controls with bounded unique delivery areas", () => {
  const valid = { orderingEnabled: false, deliveryAreas: [], deliveryFeePaisa: 0, version: 1 };
  assert.equal(storeSettingsSchema.safeParse(valid).success, true);
  for (const change of [{ paymentMethod: "card" }, { deliveryAreas: [""] }, { deliveryAreas: ["G-11", "g-11"] }, { deliveryAreas: ["a".repeat(121)] }, { deliveryAreas: Array.from({ length: 51 }, (_, index) => `Area ${index}`) }, { deliveryFeePaisa: -1 }, { orderingEnabled: "true" }, { version: 1.5 }]) assert.equal(storeSettingsSchema.safeParse({ ...valid, ...change }).success, false);
});

test("password creation uses character minimum and UTF-8 byte maximum", () => {
  assert.equal(passwordChangeSchema.safeParse({ currentPassword: "old", newPassword: "12-characters!" }).success, true);
  assert.equal(passwordChangeSchema.safeParse({ currentPassword: "old", newPassword: "\u{10400}".repeat(6) }).success, false);
  assert.equal(passwordChangeSchema.safeParse({ currentPassword: "old", newPassword: "é".repeat(513) }).success, false);
});

test("Pakistan business day boundaries use UTC+05, including UTC date crossing", () => {
  assert.deepEqual(pakistanDayBounds(new Date("2026-11-09T18:59:59Z")), { start: new Date("2026-11-08T19:00:00Z"), end: new Date("2026-11-09T19:00:00Z") });
  assert.deepEqual(pakistanDayBounds(new Date("2026-11-09T19:00:00Z")), { start: new Date("2026-11-09T19:00:00Z"), end: new Date("2026-11-10T19:00:00Z") });
});
