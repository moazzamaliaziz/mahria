import { createHmac, randomBytes, randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import type { NextRequest, NextResponse } from "next/server";
import type { AdminSessionData } from "./admin-types";
import { getPool, withTransaction } from "./db";
import { AdminError } from "./admin-http";
import { authConfig, checkAdminOrigin, constantEqual, csrfToken, hashPassword, LOGIN_ACCOUNT_LIMIT, LOGIN_GLOBAL_LIMIT, SESSION_COOKIE, SESSION_SECONDS, sessionHash, verifyPassword } from "./admin-security";

type AdminRow = RowDataPacket & { id: string; name: string; email: string; password_hash: string; disabled: number };
type SessionRow = AdminRow & { expires_at: Date };
export type AuthenticatedAdmin = { data: AdminSessionData; hash: Buffer };

export function requireAdminPool() {
  const pool = getPool();
  if (!pool) throw new AdminError("Admin database is not configured.", 503);
  return pool;
}

export async function sessionFromToken(token: string | undefined, request?: Request): Promise<AuthenticatedAdmin | null> {
  const config = authConfig(request);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const hash = sessionHash(token);
  const [rows] = await requireAdminPool().execute<SessionRow[]>(
    `SELECT a.id, a.name, a.email, s.expires_at FROM admin_sessions s
     JOIN admins a ON a.id = s.admin_id
     WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP(6) AND a.disabled = 0`, [hash],
  );
  const row = rows[0];
  if (!row) return null;
  return { hash, data: { admin: { id: row.id, name: row.name, email: row.email }, csrfToken: csrfToken(hash, config.secret), expiresAt: row.expires_at.toISOString() } };
}

export async function requireAdmin(request: NextRequest, mutation = false): Promise<AuthenticatedAdmin> {
  if (mutation) checkAdminOrigin(request);
  const session = await sessionFromToken(request.cookies.get(SESSION_COOKIE)?.value, request);
  if (!session) throw new AdminError("Sign in to continue.", 401);
  if (mutation && !constantEqual(request.headers.get("x-csrf-token") ?? "", session.data.csrfToken)) throw new AdminError("Security token expired. Refresh and try again.", 403);
  return session;
}

export function setSessionCookie(response: NextResponse, token: string, request: Request) {
  const { secure } = authConfig(request);
  response.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "strict", secure, path: "/", maxAge: SESSION_SECONDS });
}
export function clearSessionCookie(response: NextResponse, request: Request) {
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "strict", secure: authConfig(request).secure, path: "/", maxAge: 0 });
}

export async function consumeLoginAttempt(email: string, request: Request) {
  const { rateSecret } = authConfig(request);
  const bucket = (value: string) => createHmac("sha256", rateSecret).update(`admin-login\0${value}`).digest();
  const allowed = await withTransaction(async (connection) => {
    // Lock the single global bucket first. Random email addresses cannot bypass or grow the limiter without bound.
    for (const [key, limit] of [[bucket("global"), LOGIN_GLOBAL_LIMIT], [bucket(`account:${email}`), LOGIN_ACCOUNT_LIMIT]] as const) {
      await connection.execute(`INSERT INTO admin_login_buckets (bucket_hash, window_started_at, request_count)
        VALUES (?, UTC_TIMESTAMP(6), 1) ON DUPLICATE KEY UPDATE
        request_count = IF(window_started_at <= UTC_TIMESTAMP(6) - INTERVAL 15 MINUTE, 1, LEAST(request_count + 1, 1000000)),
        window_started_at = IF(window_started_at <= UTC_TIMESTAMP(6) - INTERVAL 15 MINUTE, UTC_TIMESTAMP(6), window_started_at)`, [key]);
      const [rows] = await connection.execute<(RowDataPacket & { request_count: number })[]>("SELECT request_count FROM admin_login_buckets WHERE bucket_hash = ?", [key]);
      if (rows[0].request_count > limit) return false;
    }
    await connection.execute("DELETE FROM admin_login_buckets WHERE window_started_at < UTC_TIMESTAMP(6) - INTERVAL 1 DAY LIMIT 100");
    return true;
  });
  // Commit blocked attempts too; rolling back would undo the limiter.
  if (!allowed) throw new AdminError("Too many sign-in attempts. Wait 15 minutes.", 429);
}

export async function lockAdminSession(connection: PoolConnection, session: AuthenticatedAdmin) {
  const [admins] = await connection.execute<AdminRow[]>("SELECT id, password_hash, disabled FROM admins WHERE id = ? FOR UPDATE", [session.data.admin.id]);
  const [sessions] = await connection.execute<RowDataPacket[]>("SELECT token_hash FROM admin_sessions WHERE token_hash = ? AND admin_id = ? AND expires_at > UTC_TIMESTAMP(6) FOR UPDATE", [session.hash, session.data.admin.id]);
  if (!admins[0] || admins[0].disabled || !sessions[0]) throw new AdminError("Sign in to continue.", 401);
  return admins[0];
}

export async function loginAdmin(email: string, password: string, request: NextRequest) {
  await consumeLoginAttempt(email, request);
  const [admins] = await requireAdminPool().execute<AdminRow[]>("SELECT id, name, email, password_hash, disabled FROM admins WHERE email = ?", [email]);
  const admin = admins[0];
  const valid = await verifyPassword(password, admin?.password_hash ?? null);
  if (!valid || !admin || admin.disabled) throw new AdminError("Email or password is incorrect.", 401);
  const token = randomBytes(32).toString("hex");
  const hash = sessionHash(token);
  const expires = new Date(Date.now() + SESSION_SECONDS * 1000);
  await withTransaction(async (connection) => {
    const [current] = await connection.execute<AdminRow[]>("SELECT password_hash, disabled FROM admins WHERE id = ? FOR UPDATE", [admin.id]);
    if (!current[0] || current[0].disabled || !constantEqual(current[0].password_hash, admin.password_hash)) throw new AdminError("Email or password is incorrect.", 401);
    const previous = request.cookies.get(SESSION_COOKIE)?.value;
    if (previous && /^[a-f0-9]{64}$/.test(previous)) await connection.execute("DELETE FROM admin_sessions WHERE token_hash = ?", [sessionHash(previous)]);
    await connection.execute("DELETE FROM admin_sessions WHERE expires_at <= UTC_TIMESTAMP(6)");
    await connection.execute("INSERT INTO admin_sessions (token_hash, admin_id, expires_at) VALUES (?, ?, ?)", [hash, admin.id, expires]);
  });
  return { token, data: { admin: { id: admin.id, name: admin.name, email: admin.email }, csrfToken: csrfToken(hash, authConfig(request).secret), expiresAt: expires.toISOString() } satisfies AdminSessionData };
}

export async function changeAdminPassword(session: AuthenticatedAdmin, currentPassword: string, newPassword: string, request: Request) {
  await consumeLoginAttempt(session.data.admin.email, request);
  const [rows] = await requireAdminPool().execute<AdminRow[]>("SELECT password_hash FROM admins WHERE id = ? AND disabled = 0", [session.data.admin.id]);
  const previous = rows[0]?.password_hash;
  if (!await verifyPassword(currentPassword, previous ?? null)) throw new AdminError("Current password is incorrect.", 400);
  const passwordHash = await hashPassword(newPassword);
  await withTransaction(async (connection) => {
    const admin = await lockAdminSession(connection, session);
    if (!previous || !constantEqual(admin.password_hash, previous)) throw new AdminError("Password changed. Sign in again.", 401);
    await connection.execute("UPDATE admins SET password_hash = ? WHERE id = ?", [passwordHash, session.data.admin.id]);
    await connection.execute("DELETE FROM admin_sessions WHERE admin_id = ?", [session.data.admin.id]);
    await auditEvent(connection, session.data.admin.id, "password_changed", "admin", session.data.admin.id);
  });
}

export async function auditEvent(connection: PoolConnection, adminId: string, action: string, entityType: string, entityId: string, fromStatus: string | null = null, toStatus: string | null = null) {
  await connection.execute("INSERT INTO admin_audit_events (id, admin_id, action, entity_type, entity_id, from_status, to_status) VALUES (?, ?, ?, ?, ?, ?, ?)", [randomUUID(), adminId, action, entityType, entityId, fromStatus, toStatus]);
}
