import { getPool } from "../src/lib/db";
import { askAdmin, chooseLanguage, createAdministrator, createPrompts, loadLocalEnvironment, SetupError, wording } from "./setup-helpers";

async function main() {
  if (process.argv.slice(2).some((arg) => arg !== "--reset")) throw new SetupError("Use npm run admin:create or npm run admin:reset without credentials in arguments.");
  await loadLocalEnvironment();
  const prompts = createPrompts();
  try {
    const language = await chooseLanguage(prompts);
    const reset = process.argv.includes("--reset");
    if (reset && await prompts.ask(wording(language, "Reset an existing password and revoke all its sessions? Type RESET: ", "موجودہ پاس ورڈ تبدیل اور تمام سیشن ختم کریں؟ RESET لکھیں: ")) !== "RESET") throw new SetupError("Cancelled. No changes made.");
    const input = await askAdmin(prompts, language, reset);
    await createAdministrator(input, reset);
    console.log(wording(language, reset ? "Password reset. All previous sessions are revoked." : "Admin created. Sign in at /admin.", reset ? "پاس ورڈ تبدیل ہو گیا۔ تمام پرانے سیشن ختم کر دیے گئے ہیں۔" : "ایڈمن بن گیا۔ /admin پر لاگ اِن کریں۔"));
  } finally { prompts.close(); await getPool()?.end(); }
}
main().catch((error: unknown) => {
  console.error(error instanceof SetupError ? error.message : "Admin operation failed. Check configuration and run migrations first. No credentials or database details are printed.");
  process.exitCode = 1;
});
