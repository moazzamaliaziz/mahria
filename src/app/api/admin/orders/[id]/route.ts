import type { NextRequest } from "next/server";
import { AdminError, adminFailure, adminJson, readAdminJson, validate } from "@/lib/admin-http";
import { auditEvent, lockAdminSession, requireAdmin } from "@/lib/admin-session-store";
import { getAdminOrder, validateId } from "@/lib/admin-data";
import { canTransition, orderUpdateSchema } from "@/lib/admin-validation";
import { withTransaction } from "@/lib/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdmin(request, true);
    const input = validate(orderUpdateSchema, await readAdminJson(request));
    const id = validateId((await context.params).id);
    const order = await withTransaction(async (connection) => {
      await lockAdminSession(connection, session);
      const previous = await getAdminOrder(connection, id, true);
      if (previous.version !== input.version) throw new AdminError("This order changed. Refresh before updating it.", 409);
      if (!canTransition(previous.status, input.status, previous.fulfillment)) throw new AdminError("This status change is not allowed.", 409);
      if (previous.paymentMethod !== "cod" || previous.paymentStatus !== "unpaid") throw new AdminError("Only unpaid cash orders can advance.", 409);
      if (input.status === "completed" ? input.collectPayment !== true : input.collectPayment === true) throw new AdminError("Confirm cash collection only when completing the order.");
      await connection.execute(`UPDATE orders SET status = ?, payment_status = ?, version = version + 1,
        completed_at = IF(? = 'completed', UTC_TIMESTAMP(6), completed_at), updated_at = UTC_TIMESTAMP(6)
        WHERE id = ? AND version = ?`, [input.status, input.status === "completed" ? "collected" : "unpaid", input.status, id, input.version]);
      await auditEvent(connection, session.data.admin.id, "order_status", "order", id, previous.status, input.status);
      return getAdminOrder(connection, id);
    });
    return adminJson({ order });
  } catch (error) { return adminFailure(error); }
}
