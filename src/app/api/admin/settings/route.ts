import type { NextRequest } from "next/server";
import type { ResultSetHeader } from "mysql2/promise";
import { AdminError, adminFailure, adminJson, readAdminJson, validate } from "@/lib/admin-http";
import { auditEvent, lockAdminSession, requireAdmin } from "@/lib/admin-session-store";
import { storeSettingsSchema } from "@/lib/admin-validation";
import { getStoreSettings } from "@/lib/store-settings";
import { withTransaction } from "@/lib/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try { await requireAdmin(request); return adminJson({ settings: await getStoreSettings(), paymentMethod: "cod" }); }
  catch (error) { return adminFailure(error); }
}
export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAdmin(request, true);
    const input = validate(storeSettingsSchema, await readAdminJson(request));
    const settings = await withTransaction(async (connection) => {
      await lockAdminSession(connection, session);
      const [result] = await connection.execute<ResultSetHeader>("UPDATE store_settings SET ordering_enabled = ?, delivery_areas = ?, delivery_fee_paisa = ?, version = version + 1 WHERE id = 1 AND version = ?", [input.orderingEnabled, JSON.stringify(input.deliveryAreas), input.deliveryFeePaisa, input.version]);
      if (result.affectedRows !== 1) throw new AdminError("Settings changed. Refresh before updating them.", 409);
      await auditEvent(connection, session.data.admin.id, "settings_updated", "settings", "1");
      return getStoreSettings(connection);
    });
    return adminJson({ settings, paymentMethod: "cod" });
  } catch (error) { return adminFailure(error); }
}
