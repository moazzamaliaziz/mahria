import type { NextRequest } from "next/server";
import { adminFailure, adminJson } from "@/lib/admin-http";
import { requireAdmin } from "@/lib/admin-session-store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try { return adminJson((await requireAdmin(request)).data); }
  catch (error) { return adminFailure(error); }
}
