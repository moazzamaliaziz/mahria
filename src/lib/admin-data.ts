import type { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";
import type { AdminMenuItem, AdminOrder, AdminOrdersData } from "./admin-types";
import type { Category } from "./types";
import { AdminError, validate } from "./admin-http";
import { pakistanDayBounds, statusSchema } from "./admin-validation";

type OrderRow = RowDataPacket & {
  id: string; reference: string; customer_name: string; phone: string;
  fulfillment: AdminOrder["fulfillment"]; area: string | null; address: string | null; notes: string | null;
  status: AdminOrder["status"]; payment_method: "cod"; payment_status: "unpaid" | "collected";
  subtotal_paisa: number; delivery_fee_paisa: number; total_paisa: number;
  created_at: Date; updated_at: Date; version: number;
};
type LineRow = RowDataPacket & { order_id: string; menu_item_id: string; item_name: string; quantity: number; unit_price_paisa: number; line_total_paisa: number };
type MenuRow = RowDataPacket & { id: string; name: string; name_ur: string; description: string; description_ur: string; category: Category; price_paisa: number; image: string; image_alt: string; badge: string | null; portion: string; available: number; approved: number; version: number };
export const ORDER_COLUMNS = "id, reference, customer_name, phone, fulfillment, area, address, notes, status, payment_method, payment_status, subtotal_paisa, delivery_fee_paisa, total_paisa, created_at, updated_at, version";
export const MENU_COLUMNS = "id, name, name_ur, description, description_ur, category, price_paisa, image, image_alt, badge, portion, available, approved, version";

async function orderObjects(db: Pool | PoolConnection, rows: OrderRow[]): Promise<AdminOrder[]> {
  if (!rows.length) return [];
  const [lines] = await db.execute<LineRow[]>(`SELECT order_id, menu_item_id, item_name, quantity, unit_price_paisa, line_total_paisa FROM order_items WHERE order_id IN (${rows.map(() => "?").join(",")}) ORDER BY menu_item_id`, rows.map((row) => row.id));
  return rows.map((row) => ({
    id: row.id, reference: row.reference, customerName: row.customer_name, phone: row.phone,
    fulfillment: row.fulfillment, area: row.area, address: row.address, notes: row.notes,
    status: row.status, paymentMethod: row.payment_method, paymentStatus: row.payment_status,
    subtotalPaisa: row.subtotal_paisa, deliveryFeePaisa: row.delivery_fee_paisa, totalPaisa: row.total_paisa,
    createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString(), version: row.version,
    items: lines.filter((line) => line.order_id === row.id).map((line) => ({ itemId: line.menu_item_id, name: line.item_name, quantity: line.quantity, unitPricePaisa: line.unit_price_paisa, lineTotalPaisa: line.line_total_paisa })),
  }));
}

export async function getAdminOrder(db: Pool | PoolConnection, id: string, lock = false) {
  const [rows] = await db.execute<OrderRow[]>(`SELECT ${ORDER_COLUMNS} FROM orders WHERE id = ?${lock ? " FOR UPDATE" : ""}`, [id]);
  if (!rows[0]) throw new AdminError("Order not found.", 404);
  return (await orderObjects(db, rows))[0];
}

export async function getAdminOrders(db: PoolConnection, params: URLSearchParams): Promise<AdminOrdersData> {
  const status = params.get("status") ?? "all";
  if (status !== "all") validate(statusSchema, status);
  const pageText = params.get("page") ?? "1";
  if (!/^[1-9]\d{0,5}$/.test(pageText)) throw new AdminError("Invalid page.");
  const page = Number(pageText);
  const search = (params.get("search") ?? "").trim();
  if (search.length > 120 || /[\u0000-\u001f\u007f]/.test(search)) throw new AdminError("Search must be at most 120 characters.");
  const clauses: string[] = [];
  const values: (string | number)[] = [];
  if (status !== "all") { clauses.push("status = ?"); values.push(status); }
  if (search) {
    clauses.push("(reference LIKE ? ESCAPE '!' OR customer_name LIKE ? ESCAPE '!' OR phone LIKE ? ESCAPE '!')");
    const pattern = `%${search.replace(/[!%_]/g, "!$&")}%`;
    values.push(pattern, pattern, pattern);
  }
  const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
  const [counts] = await db.execute<(RowDataPacket & { total: number })[]>(`SELECT COUNT(*) AS total FROM orders${where}`, values);
  const [rows] = await db.execute<OrderRow[]>(`SELECT ${ORDER_COLUMNS} FROM orders${where} ORDER BY created_at DESC, id DESC LIMIT 20 OFFSET ?`, [...values, String((page - 1) * 20)]);
  const { start, end } = pakistanDayBounds();
  const [stats] = await db.execute<(RowDataPacket & { new_count: number; active_count: number; today_count: number; today_revenue: number })[]>(
    `SELECT COALESCE(SUM(status = 'pending'), 0) AS new_count,
     COALESCE(SUM(status IN ('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery')), 0) AS active_count,
     COALESCE(SUM(created_at >= ? AND created_at < ?), 0) AS today_count,
     COALESCE(SUM(CASE WHEN status = 'completed' AND payment_method = 'cod' AND payment_status = 'collected' AND completed_at >= ? AND completed_at < ? THEN total_paisa ELSE 0 END), 0) AS today_revenue FROM orders`, [start, end, start, end]);
  return { orders: await orderObjects(db, rows), total: Number(counts[0].total), page, pageSize: 20,
    stats: { newCount: Number(stats[0].new_count), activeCount: Number(stats[0].active_count), todayCount: Number(stats[0].today_count), todayRevenuePaisa: Number(stats[0].today_revenue) }, generatedAt: new Date().toISOString() };
}

function menuObject(row: MenuRow): AdminMenuItem {
  if (!/^\/images\/[A-Za-z0-9_/-]+\.(?:jpg|jpeg|png|webp|avif|svg)$/.test(row.image)) throw new AdminError("Menu image must be an existing local catalog image.", 503);
  return { id: row.id, name: row.name, nameUr: row.name_ur, description: row.description, descriptionUr: row.description_ur,
    category: row.category, pricePaisa: row.price_paisa, image: row.image, imageAlt: row.image_alt, badge: row.badge, portion: row.portion,
    available: row.available === 1, approved: row.approved === 1, version: row.version };
}
export async function getAdminMenu(db: Pool | PoolConnection): Promise<AdminMenuItem[]> {
  const [rows] = await db.execute<MenuRow[]>(`SELECT ${MENU_COLUMNS} FROM menu_items ORDER BY sort_order, id`);
  return rows.map(menuObject);
}
export async function getAdminMenuItem(db: PoolConnection, id: string, lock = false): Promise<AdminMenuItem> {
  const [rows] = await db.execute<MenuRow[]>(`SELECT ${MENU_COLUMNS} FROM menu_items WHERE id = ?${lock ? " FOR UPDATE" : ""}`, [id]);
  if (!rows[0]) throw new AdminError("Menu item not found.", 404);
  return menuObject(rows[0]);
}

export function validateId(id: string) {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) throw new AdminError("Invalid item ID.");
  return id;
}
