import assert from "node:assert/strict";
import { test } from "node:test";
import { parseCart } from "../src/lib/cart";
import { formatPrice } from "../src/lib/format";

test("corrupt or missing saved bags recover to an empty bag", () => {
  for (const value of [null, "bad json", "null", "{}", '"hello"'])
    assert.deepEqual(parseCart(value), []);
});

test("saved bag sanitizes item types, duplicates, quantities and total limits", () => {
  const bag = [
    null,
    { itemId: "pulao", quantity: 20 },
    { itemId: "pulao", quantity: 1 },
    { itemId: "raita", quantity: 20 },
    { itemId: "salad", quantity: 10 },
    { itemId: "zarda", quantity: 1 },
    { itemId: "invalid", quantity: -1 },
    { itemId: "fraction", quantity: 1.5 },
    { itemId: 123, quantity: 2 },
  ];
  assert.deepEqual(parseCart(JSON.stringify(bag)), [
    { itemId: "pulao", quantity: 20 },
    { itemId: "raita", quantity: 20 },
    { itemId: "salad", quantity: 10 },
  ]);
});

test("persisted item objects retain only IDs and quantities", () => {
  assert.deepEqual(
    parseCart(
      '[{"itemId":"pulao","quantity":1,"pricePaisa":1,"customerName":"should not persist"}]',
    ),
    [{ itemId: "pulao", quantity: 1 }],
  );
});

test("integer paisa formats as Pakistani rupees", () => {
  assert.equal(formatPrice(68000), "Rs. 680");
  assert.equal(formatPrice(136000), "Rs. 1,360");
  assert.equal(formatPrice(29910), "Rs. 299.10");
});
