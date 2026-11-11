import type { NextRequest } from "next/server";
import { AdminError, adminFailure, adminJson, readAdminJson, validate } from "@/lib/admin-http";
import { auditEvent, lockAdminSession, requireAdmin } from "@/lib/admin-session-store";
import { getAdminMenuItem, validateId } from "@/lib/admin-data";
import { menuUpdateSchema } from "@/lib/admin-validation";
import { withTransaction } from "@/lib/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdmin(request, true);
    const input = validate(menuUpdateSchema, await readAdminJson(request));
    const id = validateId((await context.params).id);
    const item = await withTransaction(async (connection) => {
      await lockAdminSession(connection, session);
      const previous = await getAdminMenuItem(connection, id, true);
      if (previous.version !== input.version) throw new AdminError("This menu item changed. Refresh before updating it.", 409);
      await connection.execute(`UPDATE menu_items SET name = ?, name_ur = ?, description = ?, description_ur = ?, price_paisa = ?, available = ?, approved = ?, version = version + 1 WHERE id = ? AND version = ?`, [input.name, input.nameUr, input.description, input.descriptionUr, input.pricePaisa, input.available, input.approved, id, input.version]);
      await auditEvent(connection, session.data.admin.id, "menu_updated", "menu", id);
      return getAdminMenuItem(connection, id);
    });
    return adminJson({ item });
  } catch (error) { return adminFailure(error); }
}
