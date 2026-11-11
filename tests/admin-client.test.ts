import assert from "node:assert/strict";
import { test } from "node:test";
import {
  adminError,
  AdminClientError,
  rupeesToPaisa,
  statusLabels,
} from "../src/lib/admin-client";

test("rupee inputs convert exactly to integer paisa", () => {
  assert.equal(rupeesToPaisa("680"), 68000);
  assert.equal(rupeesToPaisa("12.50"), 1250);
  assert.equal(rupeesToPaisa("0"), 0);
  assert.equal(rupeesToPaisa("1.1"), 110);
  for (const value of [
    "-1",
    "Infinity",
    "1e5",
    "",
    "1.001",
    "1,000",
    "1000000000",
  ])
    assert.equal(rupeesToPaisa(value), null);
});

test("admin order statuses and errors have English and Urdu labels", () => {
  for (const labels of Object.values(statusLabels)) {
    assert.equal(labels.length, 2);
    assert.match(labels[1], /[\u0600-\u06ff]/);
  }
  assert.match(adminError(new AdminClientError("Changed", 409), true), /تبدیل/);
  assert.equal(
    adminError(new AdminClientError("Changed", 409), false),
    "Changed",
  );
});
