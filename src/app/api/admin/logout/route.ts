import type { NextRequest } from "next/server";
import { adminFailure, adminJson } from "@/lib/admin-http";
import { clearSessionCookie, requireAdmin, requireAdminPool } from "@/lib/admin-session-store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin(request, true);
    await requireAdminPool().execute("DELETE FROM admin_sessions WHERE token_hash = ?", [session.hash]);
    const response = adminJson({ ok: true });
    clearSessionCookie(response, request);
    return response;
  } catch (error) { return adminFailure(error); }
}
