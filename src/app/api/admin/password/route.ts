import type { NextRequest } from "next/server";
import { adminFailure, adminJson, readAdminJson, validate } from "@/lib/admin-http";
import { changeAdminPassword, clearSessionCookie, requireAdmin } from "@/lib/admin-session-store";
import { passwordChangeSchema } from "@/lib/admin-validation";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin(request, true);
    const input = validate(passwordChangeSchema, await readAdminJson(request));
    await changeAdminPassword(session, input.currentPassword, input.newPassword, request);
    const response = adminJson({ ok: true });
    clearSessionCookie(response, request);
    return response;
  } catch (error) { return adminFailure(error); }
}
