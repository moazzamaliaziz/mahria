import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { parseEnv } from "node:util";
import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { hashPassword } from "../src/lib/admin-security";
import { adminIdentitySchema, newPasswordSchema } from "../src/lib/admin-validation";
import { withTransaction } from "../src/lib/db";

export class SetupError extends Error {}

export async function readLocalEnvironment() {
  try { return await readFile(new URL("../.env.local", import.meta.url), "utf8"); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
}
export async function loadLocalEnvironment() {
  const content = await readLocalEnvironment();
  if (content !== null) for (const [key, value] of Object.entries(parseEnv(content))) if (process.env[key] === undefined) process.env[key] = value;
}

export function createPrompts() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new SetupError("Use an interactive terminal. Passwords cannot be passed in command arguments or piped input.");
  let hidden = false;
  const output = new Writable({ write(chunk, encoding, callback) { if (!hidden) process.stdout.write(chunk, encoding); callback(); } });
  const rl = createInterface({ input: process.stdin, output, terminal: true, historySize: 0 });
  rl.on("SIGINT", () => rl.close());
  return {
    async ask(label: string, secret = false): Promise<string> {
      if (!secret) return (await rl.question(label)).trim();
      process.stdout.write(label);
      hidden = true;
      try { return await rl.question(""); }
      finally { hidden = false; process.stdout.write("\n"); }
    },
    close() { hidden = false; rl.close(); },
  };
}
export type Prompts = ReturnType<typeof createPrompts>;
export type Language = "en" | "ur";
export const wording = (language: Language, en: string, ur: string) => language === "ur" ? ur : en;
export async function chooseLanguage(prompts: Prompts): Promise<Language> {
  return await prompts.ask("Language / زبان: 1 English, 2 اردو [1]: ") === "2" ? "ur" : "en";
}

export async function askAdmin(prompts: Prompts, language: Language, reset = false) {
  const name = reset ? "Password reset" : await prompts.ask(wording(language, "Admin name: ", "ایڈمن کا نام: "));
  const email = await prompts.ask(wording(language, "Admin email: ", "ایڈمن کی ای میل: "));
  const identity = adminIdentitySchema.safeParse({ name, email });
  if (!identity.success) throw new SetupError(wording(language, "Enter a valid name and email.", "درست نام اور ای میل درج کریں۔"));
  const password = await prompts.ask(wording(language, "New password (12+ characters, hidden): ", "نیا پاس ورڈ (کم از کم 12 حروف، پوشیدہ): "), true);
  if (!newPasswordSchema.safeParse(password).success) throw new SetupError(wording(language, "Use at least 12 characters and at most 1024 bytes.", "کم از کم 12 حروف اور زیادہ سے زیادہ 1024 بائٹس استعمال کریں۔"));
  const confirmation = await prompts.ask(wording(language, "Repeat password (hidden): ", "پاس ورڈ دوبارہ لکھیں (پوشیدہ): "), true);
  if (confirmation !== password) throw new SetupError(wording(language, "Passwords do not match.", "پاس ورڈ ایک جیسے نہیں ہیں۔"));
  return { ...identity.data, password };
}

export async function createAdministrator(input: { name: string; email: string; password: string }, reset = false, firstOnly = false) {
  const identity = adminIdentitySchema.parse(input);
  const passwordHash = await hashPassword(input.password);
  await withTransaction(async (connection) => {
    const [existing] = await connection.execute<(RowDataPacket & { id: string })[]>("SELECT id FROM admins WHERE email = ? FOR UPDATE", [identity.email]);
    if (reset) {
      if (!existing[0]) throw new SetupError("This admin does not exist. No password was changed.");
      await connection.execute("UPDATE admins SET password_hash = ? WHERE id = ?", [passwordHash, existing[0].id]);
      await connection.execute("DELETE FROM admin_sessions WHERE admin_id = ?", [existing[0].id]);
      await connection.execute("INSERT INTO admin_audit_events (id, admin_id, action, entity_type, entity_id) VALUES (?, ?, 'password_reset_cli', 'admin', ?)", [randomUUID(), existing[0].id, existing[0].id]);
    } else {
      if (existing[0]) throw new SetupError("This admin already exists. Use npm run admin:reset for an explicit password reset.");
      if (firstOnly) {
        const [admins] = await connection.execute<RowDataPacket[]>("SELECT id FROM admins LIMIT 1 FOR UPDATE");
        if (admins.length) throw new SetupError("An admin already exists. Use npm run admin:create to add another; setup never resets passwords.");
      }
      await connection.execute("INSERT INTO admins (id, name, email, password_hash) VALUES (?, ?, ?, ?)", [randomUUID(), identity.name, identity.email, passwordHash]);
    }
  });
}
