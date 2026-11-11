import assert from "node:assert/strict";
import { after, test } from "node:test";
import { NextRequest } from "next/server";
import { authConfig, checkAdminOrigin, constantEqual, csrfToken, hashPassword, sessionHash, verifyPassword } from "../src/lib/admin-security";
import { AdminError, readAdminJson } from "../src/lib/admin-http";
import { POST as login } from "../src/app/api/admin/login/route";
import { GET as session } from "../src/app/api/admin/session/route";
import { POST as logout } from "../src/app/api/admin/logout/route";
import { POST as password } from "../src/app/api/admin/password/route";
import { GET as orders } from "../src/app/api/admin/orders/route";
import { GET as menu } from "../src/app/api/admin/menu/route";
import { GET as settings } from "../src/app/api/admin/settings/route";

const saved = { ...process.env };
process.env.ADMIN_AUTH_SECRET = "a".repeat(64);
process.env.RATE_LIMIT_SECRET = "b".repeat(64);
process.env.APP_URL = "https://restaurant.test";
delete process.env.DATABASE_URL;
after(() => {
  for (const name of ["NODE_ENV", "ADMIN_AUTH_SECRET", "RATE_LIMIT_SECRET", "APP_URL", "DATABASE_URL"]) {
    if (saved[name] === undefined) delete process.env[name]; else process.env[name] = saved[name];
  }
});
const request = (path: string, method = "GET", body?: string, headers: Record<string, string> = {}) => new NextRequest(`https://restaurant.test/api/admin/${path}`, { method, ...(body === undefined ? {} : { body }), headers: { origin: "https://restaurant.test", "content-type": "application/json", ...headers } });

test("scrypt passwords are salted, asynchronous, bounded and verified without a plaintext fallback", async () => {
  const password = "Correct horse 2026!";
  const [first, second] = await Promise.all([hashPassword(password), hashPassword(password)]);
  assert.match(first, /^scrypt\$32768\$8\$1\$[a-f0-9]{32}\$[a-f0-9]{128}$/);
  assert.notEqual(first, second);
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword("wrong password", first), false);
  assert.equal(await verifyPassword(password, null), false);
  assert.equal(await verifyPassword(password, "malformed"), false);
  assert.equal(await verifyPassword("a".repeat(1025), first), false);
  await assert.rejects(hashPassword("short"));
  await assert.rejects(hashPassword("é".repeat(513)));
});

test("session digests and CSRF tokens bind to both session and secret", () => {
  const digest = sessionHash("a".repeat(64));
  assert.equal(digest.length, 32);
  const token = csrfToken(digest, "secret1");
  assert.equal(constantEqual(token, token), true);
  assert.equal(constantEqual(token, csrfToken(digest, "secret2")), false);
  assert.equal(constantEqual(token, csrfToken(sessionHash("b".repeat(64)), "secret1")), false);
  assert.equal(constantEqual(token, ""), false);
});

test("production auth requires a canonical HTTPS APP_URL, permits explicit localhost, and ignores forwarded headers", () => {
  const previous = process.env.NODE_ENV;
  Object.assign(process.env, { NODE_ENV: "production" });
  try {
    for (const invalid of ["", "http://restaurant.test", "https://restaurant.test/path", "https://restaurant.test?query=1", "https://user:pass@restaurant.test", "ftp://restaurant.test"]) {
      process.env.APP_URL = invalid;
      assert.throws(() => authConfig(request("session")), AdminError);
    }
    for (const local of ["http://localhost:3000", "http://127.0.0.1:3000", "http://[::1]:3000"]) {
      process.env.APP_URL = local;
      assert.equal(authConfig().secure, false);
    }
    process.env.APP_URL = "https://restaurant.test";
    assert.equal(authConfig().secure, true);
    assert.throws(() => checkAdminOrigin(request("login", "POST", "{}", { origin: "https://evil.test", "x-forwarded-host": "restaurant.test", "x-forwarded-for": "127.0.0.1" })), (error) => error instanceof AdminError && error.status === 403);
  } finally {
    if (previous === undefined) Reflect.deleteProperty(process.env, "NODE_ENV"); else Object.assign(process.env, { NODE_ENV: previous });
    process.env.APP_URL = "https://restaurant.test";
  }
});

test("admin reads and mutations require sessions and return no-store errors without PII", async () => {
  for (const [path, handler] of [["session", session], ["orders", orders], ["menu", menu], ["settings", settings]] as const) {
    const response = await handler(request(path));
    assert.equal(response.status, 401, path);
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
    assert.deepEqual(Object.keys(await response.json()), ["error"]);
  }
  assert.equal((await logout(request("logout", "POST", "{}"))).status, 401);
  assert.equal((await password(request("password", "POST", "{}"))).status, 401);
  assert.equal((await login(request("login", "POST", "{}", { origin: "https://evil.test" }))).status, 403);
  assert.equal((await login(request("login", "POST", JSON.stringify({ email: "person@example.test", password: "anything" })))).status, 503);
});

test("admin login rejects malformed inputs generically before scrypt and database work", async () => {
  for (const value of [{}, { email: "not-an-email", password: "x" }, { email: "admin@example.test", password: "x".repeat(1025) }, { email: "admin@example.test", password: "x", extra: true }]) {
    const response = await login(request("login", "POST", JSON.stringify(value)));
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Email or password is incorrect." });
  }
  assert.equal((await login(request("login", "POST", "{"))).status, 400);
  assert.equal((await login(request("login", "POST", "{}", { "content-type": "text/plain" }))).status, 415);
});

test("admin reader enforces byte cap on actual stream, even with a lying Content-Length", async () => {
  const cases: Record<string, string>[] = [{}, { "content-length": "1" }, { "content-length": "16385" }];
  for (const headers of cases) {
    assert.equal((await login(request("login", "POST", "x".repeat(16385), headers))).status, 413);
  }
  assert.equal((await login(request("login", "POST", `"${"é".repeat(9000)}"`))).status, 413);
  let cancelled = false;
  let pulls = 0;
  const stream = new ReadableStream<Uint8Array>({ pull(controller) { pulls++; controller.enqueue(new Uint8Array(8192)); }, cancel() { cancelled = true; } });
  const raw = new Request("https://restaurant.test", { method: "POST", headers: { "content-type": "application/json" }, body: stream, duplex: "half" } as RequestInit & { duplex: "half" });
  await assert.rejects(readAdminJson(raw), (error) => error instanceof AdminError && error.status === 413);
  assert.equal(cancelled, true);
  assert.ok(pulls <= 4);
});
