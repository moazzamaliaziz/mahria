import { loadLocalEnvironment } from "./setup-helpers";
import { runMigrations } from "./migrate";
import { getPool } from "../src/lib/db";

async function main() {
  await loadLocalEnvironment();
  try {
    await runMigrations();
    console.log("Migrations complete. Existing data is preserved. Menu approval and ordering are controlled in /admin.");
  } finally { await getPool()?.end(); }
}
main().catch(() => {
  console.error("Migration failed. Check the existing database URL, TLS and migration permissions. Details are hidden to protect credentials. Back up data before retrying. No menu is automatically approved.");
  process.exitCode = 1;
});
