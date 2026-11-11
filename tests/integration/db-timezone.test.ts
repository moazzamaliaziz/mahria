import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { test } from "node:test";
import type { PoolConnection as CorePoolConnection } from "mysql2";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { configureIntegration } from "../../scripts/integration-helpers";
import { getPool } from "../../src/lib/db";
import { getAdminOrders } from "../../src/lib/admin-data";
import { pakistanDayBounds } from "../../src/lib/admin-validation";
import { sessionHash } from "../../src/lib/admin-security";
import type { AdminMenuItem, AdminOrdersData, AdminSessionData, StoreSettings } from "../../src/lib/admin-types";

test("UTC pool defaults, live order timestamps, eight-hour sessions and Pakistan-day aggregates", { skip: process.env.TEST_INTEGRATION !== "1", timeout: 120000 }, async () => {
  const { fixture, origin } = await configureIntegration();
  const pool = getPool()!;
  const held: PoolConnection[] = [];
  let testCookie = "";
  let testCsrf = "";
  let originalSettings: StoreSettings | undefined;
  let enabledByTest = false;
  const call = (path: string, method = "GET", body?: unknown, session = "test") => fetch(`${origin}${path}`, {
    method, signal: AbortSignal.timeout(60000),
    headers: { origin, "content-type": "application/json", ...(session === "none" ? {} : { cookie: session === "fixture" ? fixture.adminCookie! : testCookie, "x-csrf-token": session === "fixture" ? fixture.csrfToken! : testCsrf }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  try {
    const [marker] = await pool.execute<RowDataPacket[]>("SELECT id FROM integration_test_fixture");
    assert.ok(marker.length === 1 && marker[0].id === fixture.id, "Use only the owned isolated test database.");
    held.push(...await Promise.all(Array.from({ length: 5 }, () => pool.getConnection())));
    const clocks = await Promise.all(held.map(async (connection) => {
      const [rows] = await connection.execute<RowDataPacket[]>("SELECT CONNECTION_ID() AS connection_id, @@session.time_zone AS zone, CURRENT_TIMESTAMP(6) AS current_time_value, UTC_TIMESTAMP(6) AS utc_time_value, TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), CURRENT_TIMESTAMP()) AS skew_seconds");
      assert.equal(rows[0].zone, "+00:00");
      assert.equal(rows[0].skew_seconds, 0);
      assert.ok(Math.abs(rows[0].current_time_value.getTime() - Date.now()) < 5000);
      assert.equal(rows[0].current_time_value.getTime(), rows[0].utc_time_value.getTime());
      return rows[0];
    }));
    assert.equal(new Set(clocks.map((row) => row.connection_id)).size, 5);
    console.log("EVIDENCE five independent pool connections: session +00:00; CURRENT_TIMESTAMP minus UTC_TIMESTAMP = 0 seconds");
    for (const connection of held.splice(0)) connection.release();

    // Do not send the browser fixture cookie: this independent login must not rotate it.
    const loginStarted = Date.now();
    const login = await call("/api/admin/login", "POST", { email: fixture.adminEmail, password: fixture.adminPassword }, "none");
    assert.equal(login.status, 200);
    testCookie = (login.headers.get("set-cookie") ?? "").split(";")[0];
    const session = await login.json() as AdminSessionData;
    testCsrf = session.csrfToken;
    assert.ok(Math.abs(new Date(session.expiresAt).getTime() - loginStarted - 28800000) < 10000, "Session expiry is eight hours from now.");
    const [sessions] = await pool.execute<RowDataPacket[]>("SELECT created_at, expires_at, TIMESTAMPDIFF(SECOND, created_at, expires_at) AS lifetime_seconds FROM admin_sessions WHERE token_hash = ?", [sessionHash(testCookie.split("=")[1])]);
    assert.ok(Math.abs(Number(sessions[0].lifetime_seconds) - 28800) <= 2, "SQL session creation and explicit UTC expiry share the same clock.");
    console.log(`EVIDENCE new session SQL lifetime = ${sessions[0].lifetime_seconds} seconds (expected 28800)`);

    const initialSettingsResponse = await call("/api/admin/settings");
    assert.equal(initialSettingsResponse.status, 200);
    originalSettings = (await initialSettingsResponse.json()).settings;
    if (!originalSettings!.orderingEnabled) {
      const enable = await call("/api/admin/settings", "PATCH", { ...originalSettings, orderingEnabled: true });
      assert.equal(enable.status, 200);
      enabledByTest = true;
    }
    const menuResponse = await call("/api/admin/menu");
    assert.equal(menuResponse.status, 200);
    const items = (await menuResponse.json()).items as AdminMenuItem[];
    const item = items.find((entry) => entry.approved && entry.available)!;
    assert.ok(item, "Use an already approved isolated-test item without changing the menu.");
    const before = await (await call("/api/admin/orders")).json() as AdminOrdersData;
    const started = Date.now();
    const orderResponse = await call("/api/orders", "POST", {
      idempotencyKey: randomUUID(), customerName: "Example Timezone Customer",
      phone: `0300${String(randomBytes(4).readUInt32BE() % 10000000).padStart(7, "0")}`,
      fulfillment: "pickup", paymentMethod: "cod", items: [{ itemId: item.id, quantity: 1 }], expectedTotalPaisa: item.pricePaisa,
    });
    assert.equal(orderResponse.status, 201);
    const receipt = (await orderResponse.json()).order;
    const listResponse = await call(`/api/admin/orders?search=${encodeURIComponent(receipt.reference)}`);
    assert.equal(listResponse.status, 200);
    const after = await listResponse.json() as AdminOrdersData;
    const order = after.orders[0];
    assert.ok(order && order.reference === receipt.reference);
    const created = new Date(order.createdAt).getTime();
    const generated = new Date(after.generatedAt).getTime();
    assert.ok(created >= started - 2000 && created <= Date.now() + 2000, "New order must be UTC near the actual request, not five hours in the future.");
    assert.ok(Math.abs(generated - created) < 10000, "Order timestamp and last-refreshed timestamp share the same instant.");
    assert.equal(after.stats.todayCount, before.stats.todayCount + 1);
    assert.equal(after.stats.todayRevenuePaisa, before.stats.todayRevenuePaisa);
    console.log(`EVIDENCE new order createdAt vs generatedAt delta = ${generated - created} ms; Pakistan todayCount increased by 1; unpaid revenue unchanged`);

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const baseline = await getAdminOrders(connection, new URLSearchParams());
      const { start } = pakistanDayBounds();
      for (const createdAt of [new Date(start.getTime() - 1000), start]) {
        const id = randomUUID();
        await connection.execute(`INSERT INTO orders (id, reference, idempotency_key, request_hash, customer_name, phone, fulfillment, subtotal_paisa, delivery_fee_paisa, total_paisa, status, payment_method, payment_status, created_at, completed_at)
          VALUES (?, ?, ?, ?, 'Example Boundary Customer', '+923000000000', 'pickup', 100, 0, 100, 'completed', 'cod', 'collected', ?, ?)`, [id, `TEST-${randomBytes(6).toString("hex")}`, id, randomBytes(32), createdAt, createdAt]);
      }
      const boundary = await getAdminOrders(connection, new URLSearchParams());
      assert.equal(boundary.stats.todayCount, baseline.stats.todayCount + 1);
      assert.equal(boundary.stats.todayRevenuePaisa, baseline.stats.todayRevenuePaisa + 100);
      console.log("EVIDENCE Pakistan midnight boundary: only the in-day order and its 100 paisa cash counted; synthetic boundary rows rolled back");
    } finally { await connection.rollback(); connection.release(); }

    // Verify a failed SET does not let queued business SQL run. This affects one
    // new local test-process connection only, not the running app pool.
    const oldConnections = await Promise.all(Array.from({ length: 5 }, () => pool.getConnection()));
    for (const connection of oldConnections) connection.destroy();
    pool.pool.prependOnceListener("connection", (connection: CorePoolConnection) => {
      const query = connection.query.bind(connection);
      connection.query = ((sql: unknown, ...args: unknown[]) => Reflect.apply(query, connection, [sql === "SET SESSION time_zone = '+00:00'" ? "SET SESSION time_zone = 'Invalid/Test_Zone'" : sql, ...args])) as CorePoolConnection["query"];
    });
    await assert.rejects(pool.execute({ sql: "SELECT 1 AS must_not_succeed", timeout: 5000 }));
    console.log("EVIDENCE injected UTC initialization failure rejected queued SQL rather than falling back to host time");
    assert.equal((await call("/api/admin/session", "GET", undefined, "fixture")).status, 200, "Existing browser fixture remains valid.");
  } finally {
    for (const connection of held) connection.release();
    if (enabledByTest && originalSettings && testCookie) {
      const current = await (await call("/api/admin/settings")).json();
      assert.equal((await call("/api/admin/settings", "PATCH", { ...current.settings, orderingEnabled: originalSettings.orderingEnabled })).status, 200);
    }
    if (testCookie) await call("/api/admin/logout", "POST", {});
    await pool.end();
  }
});
