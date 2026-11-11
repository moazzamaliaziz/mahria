import { NextResponse } from "next/server";
import { getStorefront } from "@/lib/storefront";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getStorefront(), {
    headers: { "Cache-Control": "no-store" },
  });
}
