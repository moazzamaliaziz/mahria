import {
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import {
  calculateOrder,
  hashOrder,
  MAX_BODY_BYTES,
  ORDER_RATE_LIMIT,
  OrderError,
  parseOrder,
} from "@/lib/order-validation";
import type { OrderReceipt, OrderStatus } from "@/lib/types";
import { getStoreSettings } from "@/lib/store-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExistingOrder = RowDataPacket & {
  request_hash: Buffer;
  reference: string;
  total_paisa: number;
  status: OrderStatus;
};

function json(
  body: { order: OrderReceipt } | { error: string },
  status: number,
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...(status === 429 ? { "Retry-After": "900" } : {}),
    },
  });
}

function checkOrigin(request: NextRequest) {
  let allowedOrigin = request.nextUrl.origin;
  if (process.env.APP_URL?.trim()) {
    try {
      const appUrl = new URL(process.env.APP_URL.trim());
      if (
        !["http:", "https:"].includes(appUrl.protocol) ||
        appUrl.username ||
        appUrl.password
      )
        throw new Error();
      allowedOrigin = appUrl.origin;
    } catch {
      throw new OrderError(
        "Ordering configuration is unavailable. Please try again later.",
        503,
      );
    }
  }
  if (request.headers.get("origin") !== allowedOrigin) {
    throw new OrderError("Submit orders from this restaurant's website.", 403);
  }
}

async function readBody(request: NextRequest): Promise<unknown> {
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  ) {
    throw new OrderError("Send the order as application/json.", 415);
  }
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null && !/^\d+$/.test(declaredLength)) {
    throw new OrderError("Invalid request Content-Length.");
  }
  if (declaredLength !== null && Number(declaredLength) > MAX_BODY_BYTES) {
    throw new OrderError(
      "The order request is too large. Keep it under 16 KB.",
      413,
    );
  }
  if (!request.body) throw new OrderError("The order request is empty.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        try {
          await reader.cancel();
        } catch {
          /* The body may already have disconnected. */
        }
        throw new OrderError(
          "The order request is too large. Keep it under 16 KB.",
          413,
        );
      }
      if (value.byteLength) chunks.push(value);
    }
    return JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(
        Buffer.concat(chunks, bytes),
      ),
    );
  } catch (error) {
    if (error instanceof OrderError) throw error;
    throw new OrderError("The order body must contain valid JSON.");
  } finally {
    reader.releaseLock();
  }
}

function replay(order: ExistingOrder, hash: Buffer) {
  if (
    order.request_hash.length !== hash.length ||
    !timingSafeEqual(order.request_hash, hash)
  ) {
    throw new OrderError(
      "This request key was already used for a different order. Start a new order request.",
      409,
    );
  }
  return json(
    {
      order: {
        reference: order.reference,
        totalPaisa: order.total_paisa,
        status: order.status,
        paymentMethod: "cod",
      },
    },
    200,
  );
}

export async function POST(request: NextRequest) {
  let connection: PoolConnection | undefined;
  let transactionOpen = false;
  try {
    checkOrigin(request);
    const input = parseOrder(await readBody(request));
    const pool = getPool();
    if (!pool)
      throw new OrderError(
        "Online ordering is not available yet. No order has been placed.",
        503,
      );
    const hash = hashOrder(input);
    connection = await pool.getConnection();
    const [existing] = await connection.execute<ExistingOrder[]>(
      "SELECT request_hash, reference, total_paisa, status FROM orders WHERE idempotency_key = ?",
      [input.idempotencyKey],
    );
    // Previously committed receipts remain retrievable even if ordering has since been disabled.
    if (existing[0]) return replay(existing[0], hash);
    const rateSecret = process.env.RATE_LIMIT_SECRET?.trim();
    if (
      !rateSecret ||
      rateSecret.length < 32
    ) {
      throw new OrderError(
        "Online ordering is currently disabled. No order has been placed.",
        503,
      );
    }
    const id = randomUUID();
    const reference = `MP-${randomBytes(6).toString("hex").toUpperCase()}`;
    await connection.beginTransaction();
    transactionOpen = true;
    const settings = await getStoreSettings(connection, true);
    if (!settings.orderingEnabled) throw new OrderError("Online ordering is currently paused. No order has been placed.", 503);
    try {
      // Reserve the unique key inside the transaction before spending a rate-limit slot.
      // The placeholder is never committed without prices and all snapshot lines.
      await connection.execute(
        `INSERT INTO orders
         (id, reference, idempotency_key, request_hash, customer_name, phone, fulfillment, area, address, notes,
          subtotal_paisa, delivery_fee_paisa, total_paisa)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0)`,
        [
          id,
          reference,
          input.idempotencyKey,
          hash,
          input.customerName,
          input.phone,
          input.fulfillment,
          input.area || null,
          input.address || null,
          input.notes || null,
        ],
      );
    } catch (error) {
      if ((error as { code?: string }).code !== "ER_DUP_ENTRY") throw error;
      await connection.rollback();
      transactionOpen = false;
      const [committed] = await connection.execute<ExistingOrder[]>(
        "SELECT request_hash, reference, total_paisa, status FROM orders WHERE idempotency_key = ?",
        [input.idempotencyKey],
      );
      if (committed[0]) return replay(committed[0], hash);
      throw new OrderError(
        "The order could not be confirmed. Retry with the same request key.",
        503,
      );
    }

    const phoneHash = createHmac("sha256", rateSecret)
      .update(input.phone)
      .digest();
    // A row lock serializes submissions across all app instances. No IP headers are trusted.
    await connection.execute(
      `INSERT INTO rate_limit_buckets (phone_hash, window_started_at, request_count)
       VALUES (?, UTC_TIMESTAMP(6), 1)
       ON DUPLICATE KEY UPDATE
       request_count = IF(window_started_at <= UTC_TIMESTAMP(6) - INTERVAL 15 MINUTE, 1, request_count + 1),
       window_started_at = IF(window_started_at <= UTC_TIMESTAMP(6) - INTERVAL 15 MINUTE, UTC_TIMESTAMP(6), window_started_at)`,
      [phoneHash],
    );
    const [buckets] = await connection.execute<
      (RowDataPacket & { request_count: number })[]
    >("SELECT request_count FROM rate_limit_buckets WHERE phone_hash = ?", [
      phoneHash,
    ]);
    if (!buckets[0] || buckets[0].request_count > ORDER_RATE_LIMIT) {
      throw new OrderError(
        "Too many orders for this mobile number. Please wait 15 minutes before trying again.",
        429,
      );
    }
    const [menu] = await connection.execute<
      (RowDataPacket & { id: string; name: string; price_paisa: number })[]
    >(
      "SELECT id, name, price_paisa FROM menu_items WHERE approved = 1 AND available = 1 LOCK IN SHARE MODE",
    );
    if (!menu.length)
      throw new OrderError(
        "The live menu is not available. No order has been placed.",
        503,
      );
    const priced = calculateOrder(
      input,
      menu.map((item) => ({
        id: item.id,
        name: item.name,
        pricePaisa: item.price_paisa,
        available: true,
      })),
      settings,
    );
    await connection.execute(
      "UPDATE orders SET subtotal_paisa = ?, delivery_fee_paisa = ?, total_paisa = ? WHERE id = ?",
      [priced.subtotalPaisa, priced.deliveryFeePaisa, priced.totalPaisa, id],
    );
    for (const line of priced.lines) {
      await connection.execute(
        `INSERT INTO order_items (order_id, menu_item_id, item_name, unit_price_paisa, quantity, line_total_paisa)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          id,
          line.itemId,
          line.name,
          line.unitPricePaisa,
          line.quantity,
          line.lineTotalPaisa,
        ],
      );
    }
    await connection.commit();
    transactionOpen = false;
    return json(
      {
        order: { reference, totalPaisa: priced.totalPaisa, status: "pending", paymentMethod: "cod" },
      },
      201,
    );
  } catch (error) {
    if (error instanceof OrderError)
      return json({ error: error.message }, error.status);
    // Never expose connection details, SQL, or customer data in API errors.
    return json(
      {
        error:
          "Ordering is temporarily unavailable. Your order could not be confirmed; retry with the same request key.",
      },
      503,
    );
  } finally {
    if (transactionOpen && connection) {
      try {
        await connection.rollback();
      } catch {
        connection.destroy();
      }
    }
    connection?.release();
  }
}
