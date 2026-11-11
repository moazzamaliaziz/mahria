import { NextResponse } from "next/server";
import type { z } from "zod";

export class AdminError extends Error {
  constructor(message: string, public readonly status = 400) { super(message); }
}

export function adminJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: {
    "Cache-Control": "no-store, private", "Pragma": "no-cache", "Vary": "Cookie",
    ...(status === 429 ? { "Retry-After": "900" } : {}),
  } });
}

export function adminFailure(error: unknown) {
  return error instanceof AdminError
    ? adminJson({ error: error.message }, error.status)
    : adminJson({ error: "Admin service is temporarily unavailable. Please try again." }, 503);
}

export async function readAdminJson(request: Request): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new AdminError("Send application/json.", 415);
  const length = request.headers.get("content-length");
  if (length !== null && !/^\d+$/.test(length)) throw new AdminError("Invalid Content-Length.");
  if (length !== null && Number(length) > 16384) throw new AdminError("Request exceeds 16 KB.", 413);
  if (!request.body) throw new AdminError("Request body is empty.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 16384) {
        try { await reader.cancel(); } catch { /* Already disconnected. */ }
        throw new AdminError("Request exceeds 16 KB.", 413);
      }
      chunks.push(value);
    }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks, bytes)));
  } catch (error) {
    if (error instanceof AdminError) throw error;
    throw new AdminError("Send valid JSON.");
  } finally { reader.releaseLock(); }
}

export function validate<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new AdminError(result.error.issues[0]?.message ?? "Check the submitted fields.");
  return result.data;
}
