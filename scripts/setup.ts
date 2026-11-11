import { chmod, lstat, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { parseEnv } from "node:util";
import type { RowDataPacket } from "mysql2/promise";
import { getPool } from "../src/lib/db";
import { authConfig } from "../src/lib/admin-security";
import { runMigrations } from "./migrate";
import { askAdmin, chooseLanguage, createAdministrator, createPrompts, readLocalEnvironment, SetupError, wording } from "./setup-helpers";

async function main() {
  if (process.argv.length > 2) throw new SetupError("Run npm run setup without arguments. Secrets are entered only at hidden prompts.");
  const prompts = createPrompts();
  try {
    const language = await chooseLanguage(prompts);
    const t = (en: string, ur: string) => wording(language, en, ur);
    console.log(t("Use an EXISTING MySQL 8 database. No cloud resources or databases will be created. Back up existing data first.", "پہلے سے موجود MySQL 8 ڈیٹابیس استعمال کریں۔ نیا کلاؤڈ یا ڈیٹابیس نہیں بنایا جائے گا۔ پہلے بیک اَپ لیں۔"));
    const file = new URL("../.env.local", import.meta.url);
    const previous = await readLocalEnvironment();
    const saved = previous === null ? {} : parseEnv(previous);
    for (const [key, value] of Object.entries(saved)) if (process.env[key] === undefined) process.env[key] = value;
    const update = previous === null || await prompts.ask(t(".env.local exists. Update it? Type YES, or Enter to keep it: ", ".env.local موجود ہے۔ تبدیلی کے لیے YES لکھیں، ورنہ Enter دبائیں: ")) === "YES";
    if (update) {
      if (previous !== null && !(await lstat(file)).isFile()) throw new SetupError("Refusing to overwrite a non-regular configuration file.");
      const values: Record<string, string> = {};
      const database = await prompts.ask(t("Existing MySQL URL (hidden; Enter keeps configured URL): ", "موجودہ MySQL URL (پوشیدہ؛ پرانا رکھنے کے لیے Enter): "), true) || process.env.DATABASE_URL || "";
      try {
        const url = new URL(database);
        if (url.protocol !== "mysql:" || !url.hostname || !url.username || !url.pathname.slice(1) || decodeURIComponent(url.pathname.slice(1)).includes("/") || /[\r\n]/.test(database)) throw new Error();
        values.DATABASE_URL = url.toString();
      } catch { throw new SetupError(t("Use mysql://USER:ENCODED_PASSWORD@HOST:3306/EXISTING_DATABASE. Nothing was saved.", "یہ شکل استعمال کریں: mysql://USER:ENCODED_PASSWORD@HOST:3306/EXISTING_DATABASE ۔ کچھ محفوظ نہیں ہوا۔")); }
      values.APP_URL = await prompts.ask(t("Website origin [http://localhost:3000, or your HTTPS domain]: ", "ویب سائٹ کا پتہ [http://localhost:3000 یا HTTPS ڈومین]: ")) || process.env.APP_URL || "http://localhost:3000";
      const remote = !["localhost", "127.0.0.1", "[::1]"].includes(new URL(values.DATABASE_URL).hostname);
      const sslDefault = process.env.DB_SSL ?? (remote ? "true" : "false");
      const ssl = await prompts.ask(t(`Verify MySQL TLS? true/false [${sslDefault}]: `, `MySQL TLS کی تصدیق؟ true/false [${sslDefault}]: `)) || sslDefault;
      if (!["true", "false"].includes(ssl)) throw new SetupError("DB_SSL must be true or false.");
      values.DB_SSL = ssl;
      values.RATE_LIMIT_SECRET = process.env.RATE_LIMIT_SECRET?.trim() || randomBytes(32).toString("hex");
      values.ADMIN_AUTH_SECRET = process.env.ADMIN_AUTH_SECRET?.trim() || randomBytes(32).toString("hex");
      values.ORDERING_ENABLED = process.env.ORDERING_ENABLED || "false";
      values.DELIVERY_AREAS = process.env.DELIVERY_AREAS || "";
      values.DELIVERY_FEE_PAISA = process.env.DELIVERY_FEE_PAISA || "0";
      for (const [key, value] of Object.entries(values)) process.env[key] = value;
      authConfig();
      // Append controlled overrides while retaining unrelated comments and configuration.
      const additions = Object.entries(values).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join("\n");
      const content = `${previous ?? "# Private local configuration. Do not share or commit.\n"}\n${additions}\n`;
      const roundTrip = parseEnv(content);
      if (Object.entries(values).some(([key, value]) => roundTrip[key] !== value)) throw new SetupError("Configuration contains unsupported quoting. Nothing was saved.");
      await writeFile(file, content, { encoding: "utf8", mode: 0o600, flag: previous === null ? "wx" : "w" });
      await chmod(file, 0o600);
      console.log(t("Private .env.local saved. On Windows, restrict this file to your account using file permissions.", "نجی .env.local محفوظ ہو گئی۔ Windows میں فائل کی اجازت صرف اپنے اکاؤنٹ تک محدود رکھیں۔"));
    }
    authConfig();
    if (!process.env.DATABASE_URL) throw new SetupError(t("DATABASE_URL is missing. Run setup again and allow a configuration update.", "DATABASE_URL موجود نہیں۔ سیٹ اَپ دوبارہ چلائیں اور تبدیلی کی اجازت دیں۔"));
    if (await prompts.ask(t("Migrate this configured database now? Type YES: ", "اس ڈیٹابیس کی مائیگریشن ابھی چلائیں؟ YES لکھیں: ")) !== "YES") throw new SetupError(t("Stopped before database changes. Configuration is ready for later use.", "ڈیٹابیس کی تبدیلی سے پہلے رک گئے۔ ترتیبات بعد میں استعمال کی جا سکتی ہیں۔"));
    await runMigrations();
    const [admins] = await getPool()!.execute<RowDataPacket[]>("SELECT id FROM admins LIMIT 1");
    if (!admins.length) await createAdministrator(await askAdmin(prompts, language), false, true);
    else console.log(t("An admin already exists. Its password was NOT changed. Use admin:create or admin:reset separately.", "ایڈمن پہلے سے موجود ہے۔ اس کا پاس ورڈ نہیں بدلا۔ admin:create یا admin:reset الگ چلائیں۔"));
    console.log(t("Setup complete. Run npm run dev, open /admin, verify menu prices, approve items, then enable ordering in Settings. Cash only.", "سیٹ اَپ مکمل۔ npm run dev چلائیں، /admin کھولیں، قیمتیں چیک کرکے مینو منظور کریں، پھر ترتیبات میں آرڈر فعال کریں۔ صرف نقد ادائیگی۔"));
  } finally { prompts.close(); await getPool()?.end(); }
}
main().catch((error: unknown) => {
  console.error(error instanceof SetupError ? error.message : "Setup failed / سیٹ اَپ ناکام۔ Check configuration, secret lengths, MySQL connection, TLS and permissions. No passwords or SQL details are printed.");
  process.exitCode = 1;
});
