import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateOrder,
  getDeliveryConfig,
  hashOrder,
  MAX_MONEY_PAISA,
  OrderError,
  parseOrder,
  phoneSchema,
} from "../src/lib/order-validation";

const input = {
  idempotencyKey: "e1b8e97a-2cb2-4baf-b435-d5ae48fdc880",
  customerName: "Ayesha Khan",
  phone: "0300 1234567",
  fulfillment: "pickup" as const,
  items: [{ itemId: "chicken-pulao", quantity: 2 }],
  expectedTotalPaisa: 90_000,
};
const menu = [
  {
    id: "chicken-pulao",
    name: "Chicken Pulao",
    pricePaisa: 45_000,
    available: true,
  },
  { id: "raita", name: "Raita", pricePaisa: 8_000, available: true },
];
const delivery = {
  deliveryAreas: ["Confirmed Area"],
  deliveryFeePaisa: 10_000,
};

test("Pakistani mobile formats normalize to one canonical phone", () => {
  for (const phone of [
    "03001234567",
    "+92 300 1234567",
    "923001234567",
    "0092-300-1234567",
    "(0300) 123-4567",
  ]) {
    assert.equal(phoneSchema.parse(phone), "+923001234567");
  }
  for (const phone of [
    "+1 300 1234567",
    "0300123456",
    "030012345678",
    "0300abc4567",
    "++923001234567",
    "+9203001234567",
  ]) {
    assert.equal(phoneSchema.safeParse(phone).success, false, phone);
  }
});

test("pickup defaults and names/notes are trimmed", () => {
  const parsed = parseOrder({
    ...input,
    fulfillment: undefined,
    customerName: "  Ayesha Khan  ",
    notes: "  No chilli  ",
  });
  assert.equal(parsed.fulfillment, "pickup");
  assert.equal(parsed.customerName, "Ayesha Khan");
  assert.equal(parsed.notes, "No chilli");
});

test("cash on delivery is the only payment option and absent payment preserves old retry hashes", () => {
  const implicit = parseOrder(input);
  const explicit = parseOrder({ ...input, paymentMethod: "cod" });
  assert.equal(implicit.paymentMethod, "cod");
  assert.deepEqual(hashOrder(implicit), hashOrder(explicit));
  for (const paymentMethod of ["card", "online", "cash", null, 1]) assert.throws(() => parseOrder({ ...input, paymentMethod }), OrderError);
});

test("name, notes, address, idempotency and unknown fields are bounded", () => {
  for (const fields of [
    { customerName: "A" },
    { customerName: "x".repeat(81) },
    { customerName: "A\u0000B" },
    { notes: "x".repeat(501) },
    { address: "x".repeat(301) },
    { idempotencyKey: "short" },
    { idempotencyKey: "x".repeat(129) },
    { total: 1 },
  ])
    assert.throws(() => parseOrder({ ...input, ...fields }), OrderError);
});

test("quantities must be integers from 1 through 20", () => {
  for (const quantity of [0, -1, 1.5, 21, "2", null]) {
    assert.throws(
      () =>
        parseOrder({
          ...input,
          items: [{ itemId: "chicken-pulao", quantity }],
        }),
      OrderError,
    );
  }
  assert.equal(
    parseOrder({ ...input, items: [{ itemId: "chicken-pulao", quantity: 20 }] })
      .items[0].quantity,
    20,
  );
});

test("reject duplicate, empty, malformed and over-50 cart lines", () => {
  assert.throws(
    () => parseOrder({ ...input, items: [...input.items, ...input.items] }),
    /only once/,
  );
  assert.throws(() => parseOrder({ ...input, items: [] }), OrderError);
  assert.throws(
    () =>
      parseOrder({ ...input, items: [{ itemId: "x' OR 1=1", quantity: 1 }] }),
    OrderError,
  );
  const items = [20, 20, 11].map((quantity, index) => ({
    itemId: `item-${index}`,
    quantity,
  }));
  assert.throws(() => parseOrder({ ...input, items }), /at most 50/);
  items[2].quantity = 10;
  assert.equal(parseOrder({ ...input, items }).items.length, 3);
});

test("delivery requires a complete address and an exact approved area", () => {
  assert.throws(
    () => parseOrder({ ...input, fulfillment: "delivery" }),
    /address/,
  );
  const order = parseOrder({
    ...input,
    fulfillment: "delivery",
    area: "Confirmed Area",
    address: "House 10, Main Road",
    expectedTotalPaisa: 100_000,
  });
  assert.equal(calculateOrder(order, menu, delivery).deliveryFeePaisa, 10_000);
  assert.throws(
    () => calculateOrder({ ...order, area: "confirmed area" }, menu, delivery),
    /not available/,
  );
  assert.throws(
    () =>
      calculateOrder(order, menu, { deliveryAreas: [], deliveryFeePaisa: 0 }),
    /not available/,
  );
});

test("server prices produce integer snapshots and pickup never incurs a delivery fee", () => {
  const result = calculateOrder(parseOrder(input), menu, delivery);
  assert.equal(result.subtotalPaisa, 90_000);
  assert.equal(result.totalPaisa, 90_000);
  assert.equal(result.deliveryFeePaisa, 0);
  assert.deepEqual(result.lines, [
    {
      itemId: "chicken-pulao",
      quantity: 2,
      name: "Chicken Pulao",
      unitPricePaisa: 45_000,
      lineTotalPaisa: 90_000,
    },
  ]);
});

test("price changes and unavailable items return a conflict, not an accepted order", () => {
  const order = parseOrder(input);
  assert.throws(
    () => calculateOrder({ ...order, expectedTotalPaisa: 1 }, menu, delivery),
    (error) =>
      error instanceof OrderError &&
      error.status === 409 &&
      /price/.test(error.message),
  );
  assert.throws(
    () => calculateOrder(order, [], delivery),
    (error) => error instanceof OrderError && error.status === 409,
  );
  assert.throws(
    () => calculateOrder(order, [{ ...menu[0], available: false }], delivery),
    /no longer available/,
  );
  assert.throws(
    () => parseOrder({ ...input, expectedTotalPaisa: 1.5 }),
    OrderError,
  );
});

test("reject invalid database prices and monetary overflow", () => {
  for (const pricePaisa of [0, -1, 2.5, Number.NaN, MAX_MONEY_PAISA + 1]) {
    assert.throws(
      () =>
        calculateOrder(
          parseOrder(input),
          [{ ...menu[0], pricePaisa }],
          delivery,
        ),
      (error) => error instanceof OrderError && error.status === 503,
    );
  }
  assert.throws(
    () =>
      calculateOrder(
        parseOrder(input),
        [{ ...menu[0], pricePaisa: MAX_MONEY_PAISA }],
        delivery,
      ),
    /too large/,
  );
});

test("idempotency hash normalizes phone/cart order but changes for meaningful payload differences", () => {
  const order = parseOrder({
    ...input,
    items: [...input.items, { itemId: "raita", quantity: 1 }],
    expectedTotalPaisa: 98_000,
  });
  const retry = parseOrder({
    ...order,
    phone: "00923001234567",
    items: [...order.items].reverse(),
  });
  assert.equal(
    hashOrder(order).toString("hex"),
    hashOrder(retry).toString("hex"),
  );
  for (const change of [
    { notes: "No chilli" },
    { expectedTotalPaisa: 99_000 },
    { customerName: "Other Person" },
    { items: input.items },
  ]) {
    assert.notEqual(
      hashOrder(order).toString("hex"),
      hashOrder({ ...order, ...change }).toString("hex"),
    );
  }
});

test("delivery config is pickup-only by default and rejects invalid fees", () => {
  const originalAreas = process.env.DELIVERY_AREAS;
  const originalFee = process.env.DELIVERY_FEE_PAISA;
  try {
    delete process.env.DELIVERY_AREAS;
    delete process.env.DELIVERY_FEE_PAISA;
    assert.deepEqual(getDeliveryConfig(), {
      deliveryAreas: [],
      deliveryFeePaisa: 0,
    });
    process.env.DELIVERY_AREAS = " Confirmed Area,Other Area,Confirmed Area ";
    process.env.DELIVERY_FEE_PAISA = "10000";
    assert.deepEqual(getDeliveryConfig(), {
      deliveryAreas: ["Confirmed Area", "Other Area"],
      deliveryFeePaisa: 10_000,
    });
    for (const fee of ["-1", "1.5", "abc", "2147483648", "Infinity"]) {
      process.env.DELIVERY_FEE_PAISA = fee;
      assert.throws(getDeliveryConfig, OrderError);
    }
  } finally {
    if (originalAreas === undefined) delete process.env.DELIVERY_AREAS;
    else process.env.DELIVERY_AREAS = originalAreas;
    if (originalFee === undefined) delete process.env.DELIVERY_FEE_PAISA;
    else process.env.DELIVERY_FEE_PAISA = originalFee;
  }
});
