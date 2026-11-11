import { readFile } from "node:fs/promises";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { getPool } from "../src/lib/db";
import { previewMenu } from "../src/lib/catalog";
import { getDeliveryConfig } from "../src/lib/order-validation";
import { storeSettingsSchema } from "../src/lib/admin-validation";
import { upgradeAdminSchema } from "../database/migrations/002-admin";

const urdu: Record<string, [string, string]> = {
  "chicken-pulao": ["شامی کے ساتھ چکن پلاؤ", "خوشبودار چاول، نرم چکن اور شامی کباب۔"],
  "special-pulao": ["مہرِیہ اسپیشل پلاؤ", "خاص ذائقے کے ساتھ خوشبودار چکن پلاؤ۔"],
  "chicken-biryani": ["چکن بریانی", "مصالحے دار چکن اور خوشبودار چاول۔"],
  "shami-kabab": ["شامی کباب", "مزیدار شامی کباب، پلاؤ کے بہترین ساتھی۔"],
  raita: ["رائتہ", "ٹھنڈا اور تازہ دہی کا رائتہ۔"],
  zarda: ["زردہ", "کھانے کے بعد میٹھے چاولوں کا لطف۔"],
};

async function seed(connection: PoolConnection) {
  await connection.beginTransaction();
  try {
    const [settings] = await connection.execute<RowDataPacket[]>("SELECT id FROM store_settings WHERE id = 1");
    if (!settings.length) {
      const initial = storeSettingsSchema.parse({ orderingEnabled: process.env.ORDERING_ENABLED === "true", ...getDeliveryConfig(), version: 1 });
      await connection.execute("INSERT INTO store_settings (id, ordering_enabled, delivery_areas, delivery_fee_paisa) VALUES (1, ?, ?, ?)", [initial.orderingEnabled, JSON.stringify(initial.deliveryAreas), initial.deliveryFeePaisa]);
    }
    for (const [index, item] of previewMenu.entries()) {
      const nameUr = item.nameUr ?? urdu[item.id]?.[0] ?? "";
      const descriptionUr = item.descriptionUr ?? urdu[item.id]?.[1] ?? "";
      await connection.execute(`INSERT INTO menu_items
        (id, name, name_ur, description, description_ur, category, price_paisa, image, image_alt, badge, portion, available, approved, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
        ON DUPLICATE KEY UPDATE id = menu_items.id`,
      [item.id, item.name, nameUr, item.description, descriptionUr, item.category, item.pricePaisa, item.image, item.imageAlt, item.badge, item.portion, item.available, index]);
      // Only initialize newly introduced empty translations, never replace an operator's text or approval.
      await connection.execute("UPDATE menu_items SET name_ur = IF(name_ur = '', ?, name_ur), description_ur = IF(description_ur = '', ?, description_ur) WHERE id = ?", [nameUr, descriptionUr, item.id]);
    }
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; }
}

export async function runMigrations() {
  const pool = getPool();
  if (!pool) throw new Error("Set an existing MySQL DATABASE_URL first.");
  const connection = await pool.getConnection();
  let locked = false;
  try {
    const [locks] = await connection.execute<(RowDataPacket & { acquired: number })[]>("SELECT GET_LOCK('mehria_schema_migrations', 15) AS acquired");
    if (locks[0].acquired !== 1) throw new Error("Another migration is running.");
    locked = true;
    await connection.execute("CREATE TABLE IF NOT EXISTS schema_migrations (version INT UNSIGNED NOT NULL PRIMARY KEY, name VARCHAR(120) NOT NULL, applied_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)) ENGINE=InnoDB");
    const migrations = [
      { version: 1, name: "baseline_tables", run: async () => {
        const sql = await readFile(new URL("../database/schema.sql", import.meta.url), "utf8");
        for (const statement of sql.split(";").map((entry) => entry.trim()).filter(Boolean)) await connection.execute(statement);
      } },
      { version: 2, name: "upgrade_existing_orders_and_menu_for_admin", run: () => upgradeAdminSchema(connection) },
      { version: 3, name: "initial_settings_and_unapproved_catalog", run: () => seed(connection) },
    ];
    for (const migration of migrations) {
      const [applied] = await connection.execute<RowDataPacket[]>("SELECT version FROM schema_migrations WHERE version = ?", [migration.version]);
      if (applied.length) continue;
      await migration.run();
      await connection.execute("INSERT INTO schema_migrations (version, name) VALUES (?, ?)", [migration.version, migration.name]);
    }
  } finally {
    if (locked) { try { await connection.execute("SELECT RELEASE_LOCK('mehria_schema_migrations')"); } catch { connection.destroy(); } }
    connection.release();
  }
}
