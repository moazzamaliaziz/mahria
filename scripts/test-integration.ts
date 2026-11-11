import assert from "node:assert/strict";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { RowDataPacket } from "mysql2/promise";
import { getPool } from "../src/lib/db";
import { verifyPassword, sessionHash } from "../src/lib/admin-security";
import { getStoreSettings } from "../src/lib/store-settings";
import type { AdminMenuItem, AdminOrder, AdminOrdersData, AdminSessionData, StoreSettings } from "../src/lib/admin-types";
import { runMigrations } from "./migrate";
import { createAdministrator } from "./setup-helpers";
import { configureIntegration, saveIntegrationFixture } from "./integration-helpers";

let stage = "configuration";
const mark = (label: string) => { stage = label; console.log(`CHECK ${label}`); };

async function main() {
  const mode = process.argv[2];
  if (!["--prepare", "--verify"].includes(mode)) throw new Error("Use --prepare or --verify.");
  const { fixture, file, origin } = await configureIntegration();
  const pool = getPool()!;
  try {
    const [tables] = await pool.execute<RowDataPacket[]>("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()");
    if (tables.length === 0 && mode === "--prepare") {
      await pool.execute("CREATE TABLE integration_test_fixture (id CHAR(36) NOT NULL PRIMARY KEY)");
      await pool.execute("INSERT INTO integration_test_fixture (id) VALUES (?)", [fixture.id]);
    }
    const [marker] = await pool.execute<RowDataPacket[]>("SELECT id FROM integration_test_fixture");
    assert.ok(marker.length === 1 && marker[0].id === fixture.id, "Refuse any database not owned by this private test fixture.");

    if (mode === "--prepare") {
      mark("legacy-schema migration preserves existing rows");
      const legacy = await readFile(new URL("../tests/integration/legacy-schema.sql", import.meta.url), "utf8");
      for (const sql of legacy.split(";").map((part) => part.trim()).filter(Boolean)) await pool.execute(sql);
      await pool.execute(`INSERT INTO menu_items (id, name, description, category, price_paisa, image, image_alt, badge, portion, available, approved)
        VALUES ('legacy-fixture', 'Legacy Test Item', 'Preserve this old menu edit.', 'Pulao', 12300, '/images/pulao.jpg', 'Test image', NULL, 'Test serving', 1, 1)
        ON DUPLICATE KEY UPDATE id = menu_items.id`);
      await pool.execute(`INSERT INTO orders (id, reference, idempotency_key, request_hash, customer_name, phone, fulfillment, subtotal_paisa, delivery_fee_paisa, total_paisa, created_at)
        VALUES ('00000000-0000-4000-8000-000000000001', 'MP-LEGACY-TEST', 'legacy-fixture-order', ?, 'Example Customer', '+923000000001', 'pickup', 12300, 0, 12300, '2025-01-01 12:00:00')
        ON DUPLICATE KEY UPDATE id = orders.id`, [Buffer.alloc(32, 1)]);
      await pool.execute(`INSERT INTO order_items (order_id, menu_item_id, item_name, unit_price_paisa, quantity, line_total_paisa)
        VALUES ('00000000-0000-4000-8000-000000000001', 'legacy-fixture', 'Original Test Snapshot', 12300, 1, 12300)
        ON DUPLICATE KEY UPDATE order_id = order_items.order_id`);
      await runMigrations();
      const initial = await getStoreSettings(pool);
      process.env.ORDERING_ENABLED = "true";
      process.env.DELIVERY_AREAS = "Must Not Replace Database Settings";
      await runMigrations();
      const repeated = await getStoreSettings(pool);
      assert.deepEqual(initial, repeated, "Repeated migrations must ignore changed seed environment.");
      const [old] = await pool.execute<RowDataPacket[]>("SELECT o.total_paisa, o.status, o.payment_method, o.version, o.created_at, o.updated_at, i.item_name FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.reference = 'MP-LEGACY-TEST'");
      assert.equal(old[0].total_paisa, 12300);
      assert.equal(old[0].status, "pending");
      assert.equal(old[0].payment_method, "cod");
      assert.equal(old[0].version, 1);
      assert.equal(old[0].item_name, "Original Test Snapshot");
      assert.equal(old[0].updated_at.toISOString(), old[0].created_at.toISOString());
      const [menu] = await pool.execute<RowDataPacket[]>("SELECT price_paisa, approved FROM menu_items WHERE id = 'legacy-fixture'");
      assert.equal(menu[0].price_paisa, 12300);
      assert.equal(menu[0].approved, 1);
      const [versions] = await pool.execute<RowDataPacket[]>("SELECT version FROM schema_migrations ORDER BY version");
      assert.deepEqual(versions.map((row) => row.version), [1, 2, 3]);
      const [existing] = await pool.execute<RowDataPacket[]>("SELECT id FROM admins WHERE email = ?", [fixture.adminEmail]);
      if (!existing.length) {
        const [approvedSeeds] = await pool.execute<RowDataPacket[]>("SELECT id FROM menu_items WHERE id <> 'legacy-fixture' AND approved = 1");
        assert.equal(approvedSeeds.length, 0, "Migration must never approve new catalog rows.");
        mark("create admin with salted async scrypt, no default password");
        await createAdministrator({ name: "Integration Admin", email: fixture.adminEmail, password: fixture.adminPassword }, false, true);
      }
      const [admins] = await pool.execute<RowDataPacket[]>("SELECT password_hash FROM admins WHERE email = ?", [fixture.adminEmail]);
      assert.ok(await verifyPassword(fixture.adminPassword, admins[0].password_hash), "Stored admin password must verify.");
      assert.match(admins[0].password_hash, /^scrypt\$32768\$8\$1\$/);
      await assert.rejects(createAdministrator({ name: "Integration Admin", email: fixture.adminEmail, password: fixture.adminPassword }), /already exists/);
      console.log("PASS legacy upgrade, migration repeatability, settings seed isolation, unapproved seeds and admin creation");
      return;
    }

    let cookie = "";
    let csrf = "";
    const call = async (path: string, method = "GET", body?: unknown, overrides: Record<string, string> = {}) => {
      const response = await fetch(`${origin}${path}`, { method, redirect: "manual", signal: AbortSignal.timeout(120000),
        headers: { ...(body === undefined ? {} : { "content-type": "application/json" }), ...(cookie ? { cookie } : {}), ...(method === "GET" ? {} : { origin, "x-csrf-token": csrf }), ...overrides },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      if (path.startsWith("/api/admin")) assert.match(response.headers.get("cache-control") ?? "", /no-store/, "Admin response must never be cached.");
      return response;
    };
    const expect = async (response: Response, status: number) => {
      assert.equal(response.status, status, `HTTP status at ${stage}`);
      return response;
    };
    const login = async () => {
      const response = await expect(await call("/api/admin/login", "POST", { email: fixture.adminEmail, password: fixture.adminPassword }), 200);
      const header = response.headers.get("set-cookie") ?? "";
      assert.match(header, /HttpOnly/i);
      assert.match(header, /SameSite=Strict/i);
      assert.match(header, /Path=\//i);
      assert.match(header, /Max-Age=28800/i);
      assert.match(header, /^mehria_admin=[a-f0-9]{64};/);
      cookie = header.split(";")[0];
      const data = await response.json() as AdminSessionData;
      csrf = data.csrfToken;
      assert.ok(new Date(data.expiresAt).getTime() > Date.now() + 7 * 60 * 60 * 1000);
      return data;
    };
    const clearLimiter = () => pool.execute("DELETE FROM admin_login_buckets");

    mark("unauthenticated endpoints and generic login rejection");
    for (const path of ["session", "orders", "menu", "settings"]) await expect(await call(`/api/admin/${path}`), 401);
    for (const [path, method] of [["logout", "POST"], ["password", "POST"], ["settings", "PATCH"], ["orders/missing", "PATCH"], ["menu/missing", "PATCH"]]) await expect(await call(`/api/admin/${path}`, method, {}), 401);
    await clearLimiter();
    await expect(await call("/api/admin/login", "POST", { email: fixture.adminEmail, password: "incorrect fixture password" }), 401);
    await expect(await call("/api/admin/login", "POST", { email: "absent@example.test", password: "incorrect fixture password" }), 401);
    await expect(await call("/api/admin/login", "POST", { email: fixture.adminEmail, password: fixture.adminPassword }, { origin: "https://attacker.test", "x-forwarded-for": "127.0.0.1" }), 403);
    await clearLimiter();

    mark("opaque cookie, DB digest, session rotation, expiry and disabled-admin checks");
    const identity = await login();
    const [sessionRows] = await pool.execute<RowDataPacket[]>("SELECT token_hash FROM admin_sessions WHERE admin_id = ?", [identity.admin.id]);
    assert.ok(sessionRows.some((row) => Buffer.isBuffer(row.token_hash) && row.token_hash.equals(sessionHash(cookie.split("=")[1]))), "Only a token digest belongs in MySQL.");
    const first = cookie;
    await login();
    assert.ok(first !== cookie, "Login must rotate the opaque cookie.");
    await expect(await call("/api/admin/session", "GET", undefined, { cookie: first }), 401);
    await pool.execute("UPDATE admins SET disabled = 1 WHERE id = ?", [identity.admin.id]);
    await expect(await call("/api/admin/session"), 401);
    await pool.execute("UPDATE admins SET disabled = 0 WHERE id = ?", [identity.admin.id]);
    await pool.execute("UPDATE admin_sessions SET expires_at = UTC_TIMESTAMP() - INTERVAL 1 SECOND WHERE token_hash = ?", [sessionHash(cookie.split("=")[1])]);
    await expect(await call("/api/admin/session"), 401);
    await login();

    mark("Origin and CSRF protection on every mutation");
    for (const [path, method] of [["logout", "POST"], ["password", "POST"], ["settings", "PATCH"], ["orders/missing", "PATCH"], ["menu/missing", "PATCH"]]) {
      await expect(await call(`/api/admin/${path}`, method, {}, { "x-csrf-token": "wrong" }), 403);
      await expect(await call(`/api/admin/${path}`, method, {}, { origin: "https://attacker.test" }), 403);
    }

    mark("menu update and version conflict, test-only catalog approval");
    const menuData = await (await expect(await call("/api/admin/menu"), 200)).json() as { items: AdminMenuItem[] };
    const original = menuData.items.find((item) => item.id === "chicken-pulao")!;
    const patch = { name: original.name, nameUr: original.nameUr, description: original.description, descriptionUr: original.descriptionUr, pricePaisa: 25000, available: true, approved: true, version: original.version };
    const changed = await (await expect(await call(`/api/admin/menu/${original.id}`, "PATCH", patch), 200)).json() as { item: AdminMenuItem };
    assert.equal(changed.item.image, original.image);
    assert.equal(changed.item.version, original.version + 1);
    await expect(await call(`/api/admin/menu/${original.id}`, "PATCH", patch), 409);
    await expect(await call(`/api/admin/menu/${original.id}`, "PATCH", { ...patch, version: changed.item.version, image: "https://attacker.test/image" }), 400);

    mark("database settings persist and override disabled server environment");
    const settingsData = await (await expect(await call("/api/admin/settings"), 200)).json() as { settings: StoreSettings };
    const enabled = { ...settingsData.settings, orderingEnabled: true, deliveryAreas: ["Test Delivery Area"], deliveryFeePaisa: 5000 };
    const updatedSettings = await (await expect(await call("/api/admin/settings", "PATCH", enabled), 200)).json() as { settings: StoreSettings; paymentMethod: string };
    assert.equal(updatedSettings.paymentMethod, "cod");
    assert.equal((await getStoreSettings(pool)).orderingEnabled, true);
    await expect(await call("/api/admin/settings", "PATCH", enabled), 409);
    const publicMenu = await (await call("/api/menu")).json();
    assert.equal(publicMenu.mode, "live");
    assert.equal(publicMenu.orderingEnabled, true);

    mark("COD validation, server price checks and idempotent concurrent order creation");
    const phone = `0300${String(randomBytes(4).readUInt32BE() % 10000000).padStart(7, "0")}`;
    const input = { idempotencyKey: randomUUID(), customerName: "Example Customer", phone, fulfillment: "pickup", items: [{ itemId: original.id, quantity: 1 }], expectedTotalPaisa: 25000, paymentMethod: "cod" };
    await expect(await call("/api/orders", "POST", { ...input, paymentMethod: "card" }), 400);
    await expect(await call("/api/orders", "POST", { ...input, expectedTotalPaisa: 1 }), 409);
    const simultaneous = await Promise.all([call("/api/orders", "POST", input), call("/api/orders", "POST", input)]);
    assert.deepEqual(simultaneous.map((response) => response.status).sort(), [200, 201]);
    const receipt = await simultaneous[0].json();
    assert.equal(receipt.order.status, "pending");
    assert.equal(receipt.order.paymentMethod, "cod");
    await expect(await call("/api/orders", "POST", { ...input, notes: "Changed test order" }), 409);
    const getList = async (search = "") => (await (await expect(await call(`/api/admin/orders?status=all&page=1&search=${encodeURIComponent(search)}`), 200)).json()) as AdminOrdersData;
    let listed = await getList(receipt.order.reference);
    assert.equal(listed.pageSize, 20);
    assert.equal(listed.total, 1);
    assert.equal(listed.orders[0].items[0].lineTotalPaisa, 25000);
    let order: AdminOrder = listed.orders[0];
    const update = async (status: AdminOrder["status"], collectPayment?: boolean, expected = 200, version = order.version) => {
      const response = await expect(await call(`/api/admin/orders/${order.id}`, "PATCH", { status, version, ...(collectPayment === undefined ? {} : { collectPayment }) }), expected);
      if (expected === 200) order = (await response.json()).order;
    };

    mark("strict pickup lifecycle, optimistic races and explicit cash collection");
    await update("completed", true, 409);
    await update("confirmed", true, 400);
    const stale = order.version;
    const raced = await Promise.all([call(`/api/admin/orders/${order.id}`, "PATCH", { status: "confirmed", version: stale }), call(`/api/admin/orders/${order.id}`, "PATCH", { status: "confirmed", version: stale })]);
    assert.deepEqual(raced.map((response) => response.status).sort(), [200, 409]);
    order = (await raced.find((response) => response.status === 200)!.json()).order;
    await update("preparing", undefined, 409, stale);
    await update("preparing");
    await update("ready");
    await update("out_for_delivery", undefined, 409);
    await update("completed", undefined, 400);
    await update("completed", false, 400);
    const revenueBefore = (await getList()).stats.todayRevenuePaisa;
    await update("completed", true);
    assert.equal(order.paymentStatus, "collected");
    listed = await getList();
    assert.equal(listed.stats.todayRevenuePaisa, revenueBefore + 25000);
    await update("cancelled", undefined, 409);
    const replay = await (await expect(await call("/api/orders", "POST", input), 200)).json();
    assert.equal(replay.order.status, "completed");
    assert.equal(replay.order.reference, receipt.order.reference);
    await assert.rejects(pool.execute("UPDATE orders SET payment_status = 'unpaid' WHERE id = ?", [order.id]), "Database must prohibit unpaid completed orders.");

    mark("delivery lifecycle and cancellation remain cash-only");
    const delivery = { ...input, idempotencyKey: randomUUID(), fulfillment: "delivery", area: "Test Delivery Area", address: "Example test address, not a real delivery", expectedTotalPaisa: 30000 };
    const deliveryReceipt = await (await expect(await call("/api/orders", "POST", delivery), 201)).json();
    order = (await getList(deliveryReceipt.order.reference)).orders[0];
    await update("confirmed"); await update("preparing"); await update("ready");
    await update("completed", true, 409);
    await update("out_for_delivery");
    await update("completed", true);
    const cancelledInput = { ...input, idempotencyKey: randomUUID() };
    const cancelReceipt = await (await expect(await call("/api/orders", "POST", cancelledInput), 201)).json();
    order = (await getList(cancelReceipt.order.reference)).orders[0];
    await update("cancelled");
    assert.equal(order.paymentStatus, "unpaid");
    await update("confirmed", undefined, 409);
    await expect(await call("/api/orders", "POST", { ...input, idempotencyKey: randomUUID() }), 429);

    mark("pausing persists, preserves live menu, rejects new orders but permits receipt replay");
    const current = await getStoreSettings(pool);
    await expect(await call("/api/admin/settings", "PATCH", { ...current, orderingEnabled: false }), 200);
    const pausedMenu = await (await call("/api/menu")).json();
    assert.equal(pausedMenu.mode, "live"); assert.equal(pausedMenu.orderingEnabled, false);
    await expect(await call("/api/orders", "POST", { ...input, idempotencyKey: randomUUID() }), 503);
    await expect(await call("/api/orders", "POST", input), 200);
    const [events] = await pool.execute<RowDataPacket[]>("SELECT action, entity_type, from_status, to_status FROM admin_audit_events WHERE admin_id = ?", [identity.admin.id]);
    assert.ok(events.some((event) => event.action === "order_status" && event.to_status === "completed"));
    const [auditColumns] = await pool.execute<RowDataPacket[]>("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'admin_audit_events'");
    assert.ok(!auditColumns.some((row) => /customer|phone|address|snapshot|password/i.test(row.COLUMN_NAME)));

    mark("logout revokes opaque session and clears cookie");
    const logout = await expect(await call("/api/admin/logout", "POST", {}), 200);
    assert.match(logout.headers.get("set-cookie") ?? "", /Max-Age=0/i);
    await expect(await call("/api/admin/session"), 401);
    cookie = ""; csrf = "";
    await clearLimiter();
    await login();
    const sessionA = cookie;
    cookie = "";
    await login();
    const sessionB = cookie;
    mark("password change revokes all sessions, old password and explicit CLI reset");
    const nextPassword = randomBytes(24).toString("base64url");
    await expect(await call("/api/admin/password", "POST", { currentPassword: "wrong current password", newPassword: nextPassword }), 400);
    const passwordResponse = await expect(await call("/api/admin/password", "POST", { currentPassword: fixture.adminPassword, newPassword: nextPassword }), 200);
    assert.match(passwordResponse.headers.get("set-cookie") ?? "", /Max-Age=0/i);
    for (const value of [sessionA, sessionB]) await expect(await call("/api/admin/session", "GET", undefined, { cookie: value }), 401);
    await clearLimiter();
    cookie = "";
    await expect(await call("/api/admin/login", "POST", { email: fixture.adminEmail, password: fixture.adminPassword }), 401);
    fixture.adminPassword = nextPassword;
    await saveIntegrationFixture(file, fixture);
    await login();
    const beforeReset = cookie;
    await createAdministrator({ name: "Integration Admin", email: fixture.adminEmail, password: fixture.adminPassword }, true);
    await expect(await call("/api/admin/session", "GET", undefined, { cookie: beforeReset }), 401);

    mark("persistent per-account and global login buckets do not trust forwarded IP");
    cookie = ""; csrf = "";
    await clearLimiter();
    for (let index = 0; index < 5; index++) await expect(await call("/api/admin/login", "POST", { email: fixture.adminEmail, password: "incorrect fixture password" }, { "x-forwarded-for": `192.0.2.${index}` }), 401);
    await expect(await call("/api/admin/login", "POST", { email: fixture.adminEmail, password: fixture.adminPassword }), 429);
    const [buckets] = await pool.execute<RowDataPacket[]>("SELECT request_count FROM admin_login_buckets");
    assert.ok(buckets.some((bucket) => bucket.request_count >= 6));
    await clearLimiter();
    const globalHash = createHmac("sha256", fixture.rateSecret).update("admin-login\0global").digest();
    await pool.execute("INSERT INTO admin_login_buckets (bucket_hash, window_started_at, request_count) VALUES (?, UTC_TIMESTAMP(6), 100)", [globalHash]);
    await expect(await call("/api/admin/login", "POST", { email: "random-account@example.test", password: "arbitrary fixture password" }, { "x-forwarded-for": "203.0.113.1" }), 429);
    const [globalCount] = await pool.execute<RowDataPacket[]>("SELECT request_count FROM admin_login_buckets WHERE bucket_hash = ?", [globalHash]);
    assert.equal(globalCount[0].request_count, 101);
    await clearLimiter();

    mark("leave authenticated browser fixture in private temporary file only");
    await login();
    fixture.adminCookie = cookie; fixture.csrfToken = csrf;
    await saveIntegrationFixture(file, fixture);
    console.log("PASS all isolated MySQL and HTTP backend integration checks; no credentials or customer payloads printed");
  } finally { await pool.end(); }
}

main().catch((error: unknown) => {
  const code = (error as { code?: string }).code;
  console.error(`FAIL ${stage}${code ? ` (${code})` : ""}. Test details and credentials are not printed.`);
  if (error instanceof assert.AssertionError) console.error(`Expected status/value: ${typeof error.expected === "number" ? error.expected : "assertion"}; actual: ${typeof error.actual === "number" ? error.actual : "mismatch"}`);
  process.exitCode = 1;
});
