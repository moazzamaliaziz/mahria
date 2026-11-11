import "server-only";
import { cookies } from "next/headers";
import type { AdminSessionData } from "./admin-types";
import { SESSION_COOKIE } from "./admin-security";
import { sessionFromToken } from "./admin-session-store";

export async function getAdminSession(): Promise<AdminSessionData | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try { return (await sessionFromToken(token))?.data ?? null; }
  catch { return null; }
}
