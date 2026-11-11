import type { NextRequest } from "next/server";
import { adminFailure, adminJson } from "@/lib/admin-http";
import { requireAdmin } from "@/lib/admin-session-store";
import { getAdminOrders } from "@/lib/admin-data";
import { withTransaction } from "@/lib/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    return adminJson(await withTransaction((connection) => getAdminOrders(connection, request.nextUrl.searchParams)));
  } catch (error) { return adminFailure(error); }
}
