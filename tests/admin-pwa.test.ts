import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";

const origin = "https://kitchen.test";
const offlineUrl = "/admin/offline.html";
const cacheName = "mehria-admin-shell-v1";
const workerSource = readFileSync(new URL("../public/admin/sw.js", import.meta.url), "utf8");
type WorkerEvent = { request?: Request; waitUntil?: (promise: Promise<unknown>) => void; respondWith?: (promise: Promise<Response>) => void };

function worker(network: (input: string | Request, init?: RequestInit) => Promise<Response>, cacheKeys: string[] = []) {
  const handlers = new Map<string, (event: WorkerEvent) => void>();
  const stored = new Map<string, Response>();
  const writes: string[] = [];
  const deleted: string[] = [];
  const opened: string[] = [];
  let claimed = false;
  let skipped = false;
  runInNewContext(workerSource, {
    URL, Request, Response,
    fetch: network,
    self: {
      location: new URL("/admin/sw.js", origin),
      addEventListener: (name: string, handler: (event: WorkerEvent) => void) => handlers.set(name, handler),
      skipWaiting: async () => { skipped = true; },
      clients: { claim: async () => { claimed = true; } },
    },
    caches: {
      keys: async () => cacheKeys,
      delete: async (name: string) => { deleted.push(name); return true; },
      open: async (name: string) => {
        opened.push(name);
        return {
          put: async (key: string, response: Response) => { writes.push(key); stored.set(key, response); },
          match: async (key: string) => stored.get(key)?.clone(),
        };
      },
    },
  });
  return {
    writes, deleted, opened, stored,
    get claimed() { return claimed; },
    get skipped() { return skipped; },
    lifecycle(name: "install" | "activate") {
      let result: Promise<unknown> | undefined;
      handlers.get(name)!({ waitUntil: (promise) => { result = promise; } });
      assert.ok(result);
      return result;
    },
    request(request: Request) {
      let response: Promise<Response> | undefined;
      handlers.get("fetch")!({ request, respondWith: (promise) => { response = promise; } });
      return response;
    },
  };
}

function navigation(path: string, headers?: HeadersInit) {
  const request = new Request(new URL(path, origin), { headers, credentials: "include" });
  // Node cannot construct browser-owned navigation requests directly.
  Object.defineProperties(request, { mode: { value: "navigate" }, destination: { value: "document" } });
  return request;
}

test("admin manifest and registration are confined to /admin/", () => {
  const manifest = JSON.parse(readFileSync(new URL("../public/admin/manifest.webmanifest", import.meta.url), "utf8"));
  assert.equal(manifest.id, "/admin/pwa");
  assert.equal(manifest.scope, "/admin/");
  assert.equal(manifest.start_url, "/admin/orders");
  assert.equal(manifest.display, "standalone");
  for (const size of [192, 512]) {
    const icon = manifest.icons.find((item: { sizes: string; purpose: string }) => item.sizes === `${size}x${size}` && item.purpose === "any");
    assert.equal(icon.type, "image/png");
    assert.ok(icon.src.startsWith("/admin/icons/"));
    const png = readFileSync(new URL(`../public${icon.src}`, import.meta.url));
    assert.equal(png.subarray(1, 4).toString(), "PNG");
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
  }
  const component = readFileSync(new URL("../src/components/admin/admin-pwa.tsx", import.meta.url), "utf8");
  assert.match(component, /export function AdminPwa\(/);
  assert.match(component, /register\("\/admin\/sw\.js", \{ scope: "\/admin\/", updateViaCache: "none" \}\)/);
  assert.match(component, /window\.location\.pathname\.startsWith\("\/admin\/"\)/);
});

test("install caches only the explicit generic screen, without credentials or redirects", async () => {
  const calls: (string | Request)[] = [];
  const instance = worker(async (input, init) => {
    calls.push(input);
    assert.equal(input, offlineUrl);
    assert.equal(init?.credentials, "omit");
    assert.equal(init?.cache, "no-store");
    assert.equal(init?.redirect, "error");
    return new Response("generic offline screen", { headers: { "content-type": "text/html; charset=utf-8" } });
  });
  await instance.lifecycle("install");
  assert.deepEqual(calls, [offlineUrl]);
  assert.deepEqual(instance.writes, [offlineUrl]);
  assert.deepEqual(instance.opened, [cacheName]);
  assert.equal(instance.skipped, true);
});

test("failed, redirected and non-HTML offline responses are never stored", async () => {
  const redirect = new Response("sign in", { headers: { "content-type": "text/html" } });
  Object.defineProperty(redirect, "redirected", { value: true });
  for (const response of [new Response("error", { status: 503 }), new Response("{}", { headers: { "content-type": "application/json" } }), redirect]) {
    const instance = worker(async () => response);
    await assert.rejects(instance.lifecycle("install"), /offline screen is unavailable/);
    assert.deepEqual(instance.writes, []);
    assert.equal(instance.skipped, false);
  }
});

test("activation removes only outdated mehria admin shell caches", async () => {
  const instance = worker(async () => new Response(), [cacheName, "mehria-admin-shell-v0", "public-assets", "another-app-shell-v1", "unrelated"]);
  await instance.lifecycle("activate");
  assert.deepEqual(instance.deleted, ["mehria-admin-shell-v0"]);
  assert.equal(instance.claimed, true);
});

test("successful authenticated navigation is network-only and never cached", async () => {
  const authenticated = new Response("private order details", { headers: { "content-type": "text/html" } });
  const instance = worker(async (request) => {
    assert.ok(request instanceof Request);
    assert.equal(request.cache, "no-store");
    assert.equal(request.credentials, "include");
    return authenticated;
  });
  assert.equal(await instance.request(navigation("/admin/orders")), authenticated);
  assert.deepEqual(instance.writes, []);
  assert.deepEqual(instance.opened, []);
});

test("API, RSC, prefetch, public routes and assets are not intercepted", () => {
  const instance = worker(async () => { throw new Error("must not fetch"); });
  const requests = [
    new Request(`${origin}/api/admin/orders`),
    navigation("/api/admin/orders"),
    new Request(`${origin}/api/admin/orders`, { method: "POST", body: "private data" }),
    new Request(`${origin}/admin/orders`, { headers: { RSC: "1" } }),
    navigation("/admin/orders", { RSC: "1" }),
    navigation("/admin/orders", { "Next-Router-Prefetch": "1" }),
    navigation("/admin/orders", { "Next-Router-Segment-Prefetch": "/" }),
    navigation("/admin/orders", { accept: "text/x-component" }),
    navigation("/admin/orders?_rsc=anything"),
    navigation("/admin/orders", { purpose: "prefetch" }),
    navigation("/admin/orders", { "sec-purpose": "prefetch;prerender" }),
    navigation("/"), navigation("/menu"), navigation("/admin"), navigation("/administrator/orders"),
    navigation("https://another.test/admin/orders"),
    new Request(`${origin}/admin/private-image.png`),
    new Request(`${origin}/admin/icons/icon-192.png`),
    new Request(`${origin}/_next/static/chunks/app.js`),
  ];
  for (const request of requests) assert.equal(instance.request(request), undefined, request.url);
  assert.deepEqual(instance.opened, []);
  assert.deepEqual(instance.writes, []);
});

test("only an unreachable document navigation receives the generic offline screen", async () => {
  const instance = worker(async () => { throw new TypeError("Failed to fetch"); });
  instance.stored.set(offlineUrl, new Response("generic offline screen"));
  const response = await instance.request(navigation("/admin/orders?status=new"));
  assert.equal(await response?.text(), "generic offline screen");
  assert.deepEqual(instance.opened, [cacheName]);
  assert.deepEqual(instance.writes, []);
});

test("real server errors do not become a misleading offline screen", async () => {
  for (const status of [401, 403, 404, 500, 503]) {
    const instance = worker(async () => new Response("server response", { status }));
    const response = await instance.request(navigation("/admin/orders"));
    assert.equal(response?.status, status);
    assert.deepEqual(instance.opened, []);
    assert.deepEqual(instance.writes, []);
  }
});

test("evicted offline cache still produces a generic no-store bilingual error", async () => {
  const instance = worker(async () => { throw new TypeError("Failed to fetch"); });
  const response = await instance.request(navigation("/admin/orders"));
  assert.equal(response?.status, 503);
  assert.equal(response?.headers.get("cache-control"), "no-store");
  const body = await response!.text();
  assert.match(body, /cannot receive or process orders offline/);
  assert.match(body, /lang="ur"/);
  assert.match(body, /href="\/admin\/orders"/);
  assert.deepEqual(instance.writes, []);
});

test("offline document is self-contained, bilingual and contains no order submission surface", () => {
  const html = readFileSync(new URL("../public/admin/offline.html", import.meta.url), "utf8");
  assert.match(html, /cannot receive or process orders offline/);
  assert.match(html, /No orders or changes are queued/);
  assert.match(html, /lang="ur" dir="rtl"/);
  assert.match(html, /href="\/admin\/orders"/);
  assert.doesNotMatch(html, /<script|<form|<input|<iframe|https?:\/\/|localStorage|indexedDB/i);
});
