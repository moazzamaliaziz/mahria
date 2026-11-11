import "server-only";
import type { RowDataPacket } from "mysql2/promise";
import { previewMenu } from "./catalog";
import { getPool } from "./db";
import { MAX_MONEY_PAISA } from "./order-validation";
import { getStoreSettings } from "./store-settings";
import type { Category, MenuItem, Storefront } from "./types";

type MenuRow = RowDataPacket & {
  id: string;
  name: string;
  name_ur: string;
  description: string;
  description_ur: string;
  category: Category;
  price_paisa: number;
  image: string;
  image_alt: string;
  badge: string | null;
  portion: string;
  available: number;
};

export async function getStorefront(): Promise<Storefront> {
  const preview: Storefront = {
    items: previewMenu,
    mode: "preview",
    orderingEnabled: false,
    deliveryAreas: [],
    deliveryFeePaisa: 0,
  };
  try {
    const pool = getPool();
    if (!pool) return preview;
    const [rows] = await pool.execute<MenuRow[]>(
      `SELECT id, name, name_ur, description, description_ur, category, price_paisa, image, image_alt, badge, portion, available
       FROM menu_items WHERE approved = 1 ORDER BY sort_order, id`,
    );
    if (!rows.length) return preview;
    const settings = await getStoreSettings(pool);
    if (settings.orderingEnabled && (process.env.RATE_LIMIT_SECRET?.trim().length ?? 0) < 32) {
      return { ...preview, mode: "unavailable" };
    }
    const items: MenuItem[] = rows.map((row) => {
      if (
        !Number.isSafeInteger(row.price_paisa) ||
        row.price_paisa <= 0 ||
        row.price_paisa > MAX_MONEY_PAISA
      ) {
        throw new Error("Invalid menu price.");
      }
      return {
        id: row.id,
        name: row.name,
        nameUr: row.name_ur,
        description: row.description,
        descriptionUr: row.description_ur,
        category: row.category,
        pricePaisa: row.price_paisa,
        image: row.image,
        imageAlt: row.image_alt,
        badge: row.badge,
        portion: row.portion,
        available: row.available === 1,
      };
    });
    return {
      items,
      mode: "live",
      orderingEnabled: settings.orderingEnabled && items.some((item) => item.available),
      deliveryAreas: settings.deliveryAreas,
      deliveryFeePaisa: settings.deliveryFeePaisa,
    };
  } catch {
    return { ...preview, mode: "unavailable" };
  }
}
