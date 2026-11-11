import type { NextRequest } from "next/server";
import { adminFailure, adminJson } from "@/lib/admin-http";
import { requireAdmin, requireAdminPool } from "@/lib/admin-session-store";
import { getAdminMenu } from "@/lib/admin-data";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try { await requireAdmin(request); return adminJson({ items: await getAdminMenu(requireAdminPool()) }); }
  catch (error) { return adminFailure(error); }
}
