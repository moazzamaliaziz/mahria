import assert from "node:assert/strict";
import { after, test } from "node:test";
import { randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { adminJson } from "../src/lib/admin-http";
import { clearSessionCookie, setSessionCookie } from "../src/lib/admin-session-store";
import { POST as login } from "../src/app/api/admin/login/route";
import { GET as session } from "../src/app/api/admin/session/route";

const names = ["NODE_ENV", "APP_URL", "ADMIN_AUTH_SECRET", "RATE_LIMIT_SECRET", "DATABASE_URL"];
const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
const valid = () => {
  Object.assign(process.env, { NODE_ENV: "production", APP_URL: "https://restaurant.test", ADMIN_AUTH_SECRET: "a".repeat(64), RATE_LIMIT_SECRET: "b".repeat(64) });
  delete process.env.DATABASE_URL;
};
after(() => { for (const name of names) if (previous[name] === undefined) delete process.env[name]; else process.env[name] = previous[name]; });
const request = () => new NextRequest("https://restaurant.test/api/admin/login", { method: "POST", headers: { origin: "https://restaurant.test", "content-type": "application/json" }, body: JSON.stringify({ email: "example@example.test", password: "example password only" }) });

test("production authentication fails closed for missing/short secrets and missing/noncanonical origins", async () => {
  for (const [name, value] of [["APP_URL", ""], ["APP_URL", "http://restaurant.test"], ["APP_URL", "https://restaurant.test/path"], ["ADMIN_AUTH_SECRET", ""], ["ADMIN_AUTH_SECRET", "short"], ["RATE_LIMIT_SECRET", ""], ["RATE_LIMIT_SECRET", "short"]]) {
    valid(); process.env[name] = value;
    for (const response of [await login(request()), await session(new NextRequest("https://restaurant.test/api/admin/session"))]) {
      assert.equal(response.status, 503, `Fail closed for invalid ${name}`);
      assert.match(response.headers.get("cache-control") ?? "", /no-store/);
      assert.deepEqual(Object.keys(await response.json()), ["error"]);
      assert.equal(response.headers.get("set-cookie"), null);
    }
  }
});

test("proper production configuration still refuses login when the database is missing", async () => {
  valid();
  const response = await login(request());
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("set-cookie"), null);
});

test("HTTPS cookies are Secure HttpOnly Strict, path-wide, opaque and expire after eight hours", () => {
  valid();
  const response = adminJson({ ok: true });
  const token = randomBytes(32).toString("hex");
  setSessionCookie(response, token, request());
  const cookie = response.headers.get("set-cookie") ?? "";
  assert.match(cookie, /^mehria_admin=[a-f0-9]{64};/);
  for (const flag of [/; Secure/i, /; HttpOnly/i, /; SameSite=Strict/i, /; Path=\//i, /; Max-Age=28800/i]) assert.ok(flag.test(cookie), "Required cookie flag is present.");
  clearSessionCookie(response, request());
  const cleared = response.headers.get("set-cookie") ?? "";
  assert.match(cleared, /Max-Age=0/i);
  assert.match(cleared, /; Secure/i);
});

test("the explicit HTTP localhost exception does not weaken public production origin requirements", async () => {
  valid(); process.env.APP_URL = "http://localhost:3001";
  const localRequest = new NextRequest("http://localhost:3001/api/admin/session");
  assert.equal((await session(localRequest)).status, 401);
  const response = adminJson({ ok: true });
  setSessionCookie(response, randomBytes(32).toString("hex"), localRequest);
  assert.ok(!/; Secure/i.test(response.headers.get("set-cookie") ?? ""));
  assert.match(response.headers.get("set-cookie") ?? "", /HttpOnly/i);
});
