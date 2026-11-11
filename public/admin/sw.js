/* Only a public, credential-free offline document is stored. No runtime caching. */
const CACHE_PREFIX = "mehria-admin-shell-";
const CACHE_NAME = `${CACHE_PREFIX}v1`;
const OFFLINE_URL = "/admin/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const response = await fetch(OFFLINE_URL, { credentials: "omit", cache: "no-store", redirect: "error" });
    if (!response.ok || response.redirected || !response.headers.get("content-type")?.includes("text/html")) {
      throw new Error("The generic admin offline screen is unavailable.");
    }
    const cache = await caches.open(CACHE_NAME);
    await cache.put(OFFLINE_URL, response);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  // A document navigation is distinct from Next RSC/prefetch, API and asset requests.
  if (request.method !== "GET" || request.mode !== "navigate" || request.destination !== "document" ||
      url.origin !== self.location.origin || !url.pathname.startsWith("/admin/") ||
      request.headers.has("RSC") || request.headers.has("Next-Router-Prefetch") ||
      request.headers.has("Next-Router-Segment-Prefetch") || url.searchParams.has("_rsc") ||
      request.headers.get("accept")?.includes("text/x-component") ||
      request.headers.get("purpose") === "prefetch" || request.headers.get("sec-purpose")?.includes("prefetch")) return;

  event.respondWith((async () => {
    try {
      // Preserve normal authentication on the wire, but never read or write a page cache.
      return await fetch(new Request(request, { cache: "no-store" }));
    } catch {
      const cache = await caches.open(CACHE_NAME);
      const offline = await cache.match(OFFLINE_URL);
      return offline || new Response("<!doctype html><html lang=\"en\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Mehria Kitchen | Offline</title><h1>You are offline</h1><p>You cannot receive or process orders offline. Nothing is queued.</p><p lang=\"ur\" dir=\"rtl\">آپ آف لائن ہیں۔ آرڈر وصول یا پراسیس نہیں ہو سکتے۔ کوئی آرڈر قطار میں محفوظ نہیں ہوتا۔</p><a href=\"/admin/orders\">Try online / <span lang=\"ur\" dir=\"rtl\">آن لائن دوبارہ کوشش کریں</span></a></html>", {
        status: 503,
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
      });
    }
  })());
});
