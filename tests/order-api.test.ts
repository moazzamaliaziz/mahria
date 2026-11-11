import assert from "node:assert/strict";
import { after, test } from "node:test";
import { NextRequest } from "next/server";
import { POST } from "../src/app/api/orders/route";

const originalDatabase = process.env.DATABASE_URL;
const originalAppUrl = process.env.APP_URL;
delete process.env.DATABASE_URL;
delete process.env.APP_URL;
after(() => {
  if (originalDatabase === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabase;
  if (originalAppUrl === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = originalAppUrl;
});

const validBody = JSON.stringify({
  idempotencyKey: "e1b8e97a-2cb2-4baf-b435-d5ae48fdc880",
  customerName: "Ayesha Khan",
  phone: "03001234567",
  fulfillment: "pickup",
  items: [{ itemId: "chicken-pulao", quantity: 2 }],
  expectedTotalPaisa: 90_000,
});
function request(body = validBody, headers: Record<string, string> = {}) {
  return new NextRequest("https://restaurant.test/api/orders", {
    method: "POST",
    body,
    headers: {
      origin: "https://restaurant.test",
      "content-type": "application/json",
      ...headers,
    },
  });
}

test("missing database returns a no-store 503, never a pretend receipt", async () => {
  const result = await POST(request());
  assert.equal(result.status, 503);
  assert.equal(result.headers.get("cache-control"), "no-store");
  assert.deepEqual(Object.keys(await result.json()), ["error"]);
});

test("cross-origin and missing Origin submissions are forbidden; forwarded headers do not authorize", async () => {
  for (const origin of ["https://attacker.test", "null", ""]) {
    const result = await POST(
      request(validBody, {
        origin,
        "x-forwarded-host": "attacker.test",
        "x-forwarded-for": "127.0.0.1",
      }),
    );
    assert.equal(result.status, 403);
  }
  const withoutOrigin = request();
  withoutOrigin.headers.delete("origin");
  assert.equal((await POST(withoutOrigin)).status, 403);
});

test("APP_URL selects the canonical allowed origin", async () => {
  process.env.APP_URL = "https://public.restaurant.test";
  try {
    assert.equal((await POST(request())).status, 403);
    assert.equal(
      (
        await POST(
          request(validBody, { origin: "https://public.restaurant.test" }),
        )
      ).status,
      503,
    );
  } finally {
    delete process.env.APP_URL;
  }
});

test("reject non-JSON, malformed JSON and invalid order input before database access", async () => {
  assert.equal(
    (await POST(request(validBody, { "content-type": "text/plain" }))).status,
    415,
  );
  assert.equal((await POST(request("{"))).status, 400);
  assert.equal((await POST(request("{}"))).status, 400);
  assert.equal((await POST(request(JSON.stringify({ ...JSON.parse(validBody), paymentMethod: "card" })))).status, 400);
});

test("body cap checks actual bytes even when Content-Length lies or is absent", async () => {
  const cases: Record<string, string>[] = [
    {},
    { "content-length": "1" },
    { "content-length": "20000" },
  ];
  for (const headers of cases) {
    const result = await POST(request("x".repeat(16 * 1024 + 1), headers));
    assert.equal(result.status, 413);
  }
  assert.equal(
    (await POST(request(`"${"\u00e9".repeat(9_000)}"`))).status,
    413,
  );
});

test("chunked request reading cancels as soon as the stream exceeds 16 KB", async () => {
  let cancelled = false;
  let reads = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      reads++;
      controller.enqueue(new Uint8Array(8_192));
    },
    cancel() {
      cancelled = true;
    },
  });
  const raw = new Request("https://restaurant.test/api/orders", {
    method: "POST",
    headers: {
      origin: "https://restaurant.test",
      "content-type": "application/json",
    },
    body,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
  assert.equal((await POST(new NextRequest(raw))).status, 413);
  assert.equal(cancelled, true);
  assert.ok(reads <= 4, "must stop pulling once the body exceeds its cap");
});
