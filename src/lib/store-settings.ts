import type { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";
import { getPool } from "./db";
import { storeSettingsSchema } from "./admin-validation";
import type { StoreSettings } from "./admin-types";

export async function getStoreSettings(connection?: Pool | PoolConnection, lock = false): Promise<StoreSettings> {
  const db = connection ?? getPool();
  if (!db) throw new Error("Store database is not configured.");
  const [rows] = await db.execute<(RowDataPacket & { ordering_enabled: number; delivery_areas: string | string[]; delivery_fee_paisa: number; version: number })[]>(
    `SELECT ordering_enabled, delivery_areas, delivery_fee_paisa, version FROM store_settings WHERE id = 1${lock ? " LOCK IN SHARE MODE" : ""}`,
  );
  if (!rows[0]) throw new Error("Run database migrations first.");
  const row = rows[0];
  return storeSettingsSchema.parse({
    orderingEnabled: row.ordering_enabled === 1,
    deliveryAreas: typeof row.delivery_areas === "string" ? JSON.parse(row.delivery_areas) : row.delivery_areas,
    deliveryFeePaisa: row.delivery_fee_paisa, version: row.version,
  });
}
