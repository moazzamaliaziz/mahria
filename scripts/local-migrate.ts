import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { getPool } from "../src/lib/db";
import { runMigrations } from "./migrate";

async function main() {
  const values = parseEnv(await readFile(new URL("../.local/mysql/migration.env", import.meta.url), "utf8"));
  if (!values.DATABASE_URL?.startsWith("mysql://mehria_migrator:") || !values.DATABASE_URL.endsWith("@127.0.0.1:3307/mehria_pulao")) throw new Error("Unexpected local migration target.");
  Object.assign(process.env, values);
  try { await runMigrations(); console.log("Local migrations complete. Existing data and approvals preserved."); }
  finally { await getPool()?.end(); }
}
main().catch(() => { console.error("Local migration failed. Start npm run db:start and check private configuration. No credentials are printed."); process.exitCode = 1; });
