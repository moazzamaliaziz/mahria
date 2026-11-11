import type { NextRequest } from "next/server";
import { adminFailure, adminJson, AdminError, readAdminJson } from "@/lib/admin-http";
import { checkAdminOrigin } from "@/lib/admin-security";
import { loginSchema } from "@/lib/admin-validation";
import { loginAdmin, setSessionCookie } from "@/lib/admin-session-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    checkAdminOrigin(request);
    const parsed = loginSchema.safeParse(await readAdminJson(request));
    if (!parsed.success) throw new AdminError("Email or password is incorrect.", 401);
    const { token, data } = await loginAdmin(parsed.data.email, parsed.data.password, request);
    const response = adminJson(data);
    setSessionCookie(response, token, request);
    return response;
  } catch (error) { return adminFailure(error); }
}
