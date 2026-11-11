import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { AdminError } from "./admin-http";
import { newPasswordSchema } from "./admin-validation";

export const SESSION_SECONDS = 8 * 60 * 60;
export const SESSION_COOKIE = "mehria_admin";
export const LOGIN_ACCOUNT_LIMIT = 5;
export const LOGIN_GLOBAL_LIMIT = 100;

export function authConfig(request?: Request) {
  const secret = process.env.ADMIN_AUTH_SECRET?.trim();
  const rateSecret = process.env.RATE_LIMIT_SECRET?.trim();
  if (!secret || secret.length < 32 || !rateSecret || rateSecret.length < 32) throw new AdminError("Admin security is not configured.", 503);
  const configured = process.env.APP_URL?.trim();
  if (!configured && process.env.NODE_ENV === "production") throw new AdminError("APP_URL is required for production authentication.", 503);
  let url: URL;
  try {
    url = new URL(configured || request?.url || "http://localhost:3000");
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || (configured && (url.pathname !== "/" || url.search || url.hash))) throw new Error();
    if (process.env.NODE_ENV === "production" && url.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new Error();
  } catch { throw new AdminError("APP_URL must be a canonical HTTPS origin (HTTP is allowed on localhost).", 503); }
  return { secret, rateSecret, origin: url.origin, secure: url.protocol === "https:" };
}

export function checkAdminOrigin(request: Request) {
  const config = authConfig(request);
  if (request.headers.get("origin") !== config.origin) throw new AdminError("Use this restaurant's admin website.", 403);
  return config;
}

export function constantEqual(left: string, right: string) {
  // Fixed-size digests avoid leaking token length through the comparison.
  return timingSafeEqual(createHash("sha256").update(left).digest(), createHash("sha256").update(right).digest());
}
export function sessionHash(token: string) { return createHash("sha256").update(token).digest(); }
export function csrfToken(hash: Buffer, secret: string) { return createHmac("sha256", secret).update("admin-csrf\0").update(hash).digest("hex"); }

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key)));
}

export async function hashPassword(password: string) {
  newPasswordSchema.parse(password);
  const salt = randomBytes(16);
  return `scrypt$32768$8$1$${salt.toString("hex")}$${(await derive(password, salt)).toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string | null): Promise<boolean> {
  if (Buffer.byteLength(password, "utf8") > 1024) return false;
  const match = encoded?.match(/^scrypt\$32768\$8\$1\$([a-f0-9]{32})\$([a-f0-9]{128})$/);
  // Unknown/disabled accounts still pay exactly the same bounded scrypt cost.
  const actual = await derive(password, match ? Buffer.from(match[1], "hex") : Buffer.alloc(16));
  const expected = match ? Buffer.from(match[2], "hex") : Buffer.alloc(64);
  return timingSafeEqual(actual, expected) && Boolean(match);
}
