import { access, cp, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { isAbsolute, join, resolve } from "node:path";
import { createConnection, type RowDataPacket } from "mysql2/promise";
import { escape } from "mysql2";
import { getPool } from "../src/lib/db";
import { verifyPassword } from "../src/lib/admin-security";
import { createAdministrator } from "./setup-helpers";
import { runMigrations } from "./migrate";

const exec = promisify(execFile);
const project = fileURLToPath(new URL("../", import.meta.url));
const privateRoot = join(project, ".local");
const mysqlRoot = join(privateRoot, "mysql");
const server = join(mysqlRoot, "server");
const stateFile = join(mysqlRoot, "setup-state.json");
const envFile = join(project, ".env.local");
type State = { rootPassword: string; appPassword: string; migrationPassword: string; adminPassword: string; authSecret: string; rateSecret: string; email: string; name: string; initialized: boolean };
const exists = (path: string) => access(path).then(() => true, () => false);
const secret = () => randomBytes(24).toString("base64url");
const url = (user: string, password: string) => `mysql://${user}:${encodeURIComponent(password)}@127.0.0.1:3307/mehria_pulao`;
const envText = (values: Record<string, string>) => Object.entries(values).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join("\n") + "\n";

async function protect(path: string, directory = false) {
  const account = `${process.env.USERDOMAIN}\\${process.env.USERNAME}`;
  if (!process.env.USERDOMAIN || !process.env.USERNAME) throw new Error("Cannot identify file owner.");
  const permission = directory ? "(OI)(CI)(F)" : "(F)";
  await exec("icacls", [path, "/inheritance:r", "/grant:r", `${account}:${permission}`, `*S-1-5-18:${permission}`], { windowsHide: true });
}

async function prepare() {
  if (await exists(envFile)) throw new Error("Existing application configuration must not be overwritten.");
  const source = process.env.MYSQL_SOURCE_DIR;
  if (!source || !isAbsolute(source)) throw new Error("Supply an explicitly verified portable MySQL 8 source directory.");
  await access(join(source, "bin", "mysqld.exe"));
  if (await exists(privateRoot)) throw new Error("Local setup already exists; refusing to overwrite it.");
  await mkdir(privateRoot);
  await protect(privateRoot, true);
  await mkdir(mysqlRoot);
  const state: State = { rootPassword: secret(), appPassword: secret(), migrationPassword: secret(), adminPassword: secret(), authSecret: randomBytes(32).toString("hex"), rateSecret: randomBytes(32).toString("hex"), email: "admin@mehria.local", name: "Mehria Administrator", initialized: false };
  await writeFile(stateFile, JSON.stringify(state), { flag: "wx", mode: 0o600 });
  await protect(stateFile);
  console.log("Copying the verified MySQL distribution into the private project directory.");
  await cp(resolve(source), server, { recursive: true, errorOnExist: true, force: false });
  const path = (value: string) => JSON.stringify(value.replaceAll("\\", "/"));
  await writeFile(join(mysqlRoot, "my.ini"), `[mysqld]\nbasedir=${path(server)}\ndatadir=${path(join(mysqlRoot, "data"))}\nport=3307\nbind-address=127.0.0.1\nmysqlx=0\nskip-name-resolve\nskip-log-bin\nmax-connections=30\ninnodb-buffer-pool-size=134217728\ndefault-time-zone=+00:00\nlog-error=${path(join(mysqlRoot, "mysql-error.log"))}\n`, { flag: "wx" });
  console.log("Initializing a new, separate database directory. Existing test data is untouched.");
  await exec(join(server, "bin", "mysqld.exe"), ["--no-defaults", "--initialize-insecure", `--basedir=${server}`, `--datadir=${join(mysqlRoot, "data")}`, `--log-error=${join(mysqlRoot, "initialize.log")}`], { cwd: mysqlRoot, windowsHide: true, timeout: 120000 });
  const bootstrap = [
    `ALTER USER 'root'@'localhost' IDENTIFIED BY ${escape(state.rootPassword)};`,
    `CREATE USER 'root'@'127.0.0.1' IDENTIFIED BY ${escape(state.rootPassword)};`,
    "GRANT ALL PRIVILEGES ON *.* TO 'root'@'127.0.0.1' WITH GRANT OPTION;",
    "CREATE DATABASE mehria_pulao CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;",
    `CREATE USER 'mehria_app'@'127.0.0.1' IDENTIFIED BY ${escape(state.appPassword)};`,
    "GRANT SELECT, INSERT, UPDATE, DELETE ON mehria_pulao.* TO 'mehria_app'@'127.0.0.1';",
    `CREATE USER 'mehria_migrator'@'127.0.0.1' IDENTIFIED BY ${escape(state.migrationPassword)};`,
    "GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES ON mehria_pulao.* TO 'mehria_migrator'@'127.0.0.1';",
  ].join("\n");
  await writeFile(join(mysqlRoot, "bootstrap.sql"), bootstrap + "\n", { mode: 0o600, flag: "wx" });
  await writeFile(join(mysqlRoot, "root-client.ini"), `[client]\nhost=127.0.0.1\nport=3307\nuser=root\npassword=${state.rootPassword}\nprotocol=TCP\n`, { mode: 0o600, flag: "wx" });
  await writeFile(join(mysqlRoot, "migration.env"), envText({ DATABASE_URL: url("mehria_migrator", state.migrationPassword), DB_SSL: "false", ORDERING_ENABLED: "false", DELIVERY_AREAS: "", DELIVERY_FEE_PAISA: "0" }), { mode: 0o600, flag: "wx" });
  state.initialized = true;
  await writeFile(stateFile, JSON.stringify(state), { mode: 0o600 });
  console.log("Prepared. Start npm run db:start, then run this script with --finish. No credentials were printed.");
}

async function finish() {
  if (await exists(envFile)) throw new Error("An application configuration already exists. No credentials were overwritten.");
  const state: State = JSON.parse(await readFile(stateFile, "utf8"));
  if (!state.initialized || !state.authSecret || !state.appPassword) throw new Error("Preparation is incomplete.");
  Object.assign(process.env, { DATABASE_URL: url("mehria_migrator", state.migrationPassword), DB_SSL: "false", ORDERING_ENABLED: "false", DELIVERY_AREAS: "", DELIVERY_FEE_PAISA: "0" });
  try {
    await runMigrations();
    const [admins] = await getPool()!.execute<RowDataPacket[]>("SELECT email, password_hash FROM admins");
    if (admins.length) {
      if (admins.length !== 1 || admins[0].email !== state.email || !await verifyPassword(state.adminPassword, admins[0].password_hash)) throw new Error("Unexpected existing admin. No password was changed.");
    } else await createAdministrator({ name: state.name, email: state.email, password: state.adminPassword }, false, true);
    const [menu] = await getPool()!.execute<RowDataPacket[]>("SELECT COUNT(*) AS total, SUM(approved) AS approved FROM menu_items");
    const [settings] = await getPool()!.execute<RowDataPacket[]>("SELECT ordering_enabled FROM store_settings WHERE id = 1");
    if (!menu[0].total || Number(menu[0].approved) !== 0 || settings[0].ordering_enabled) throw new Error("Unexpected approval state. Ordering must remain disabled.");
    const runtime = await createConnection(url("mehria_app", state.appPassword));
    try {
      await runtime.query("SELECT COUNT(*) FROM menu_items");
      const [grants] = await runtime.query<RowDataPacket[]>("SHOW GRANTS FOR CURRENT_USER");
      if (grants.some((row) => /GRANT (ALL|.*\b(CREATE|ALTER|DROP)\b)/.test(String(Object.values(row)[0])))) throw new Error("Runtime account has excessive privileges.");
    } finally { await runtime.end(); }
    const credentials = `LOCAL MEHRIA ADMIN / مقامی مہریہ ایڈمن\n\nLogin: http://localhost:3000/admin/login\nEmail: ${state.email}\nPassword: ${state.adminPassword}\n\nKeep this file private. Store the password in your password manager. Change it in Admin > Store settings after first sign-in; this file will not update automatically.\nیہ فائل نجی رکھیں۔ پاس ورڈ کسی کے ساتھ شیئر نہ کریں۔ پہلی بار لاگ اِن کرنے کے بعد ترتیبات سے پاس ورڈ تبدیل کریں۔\n\nStart database: npm run db:start\nStart website: npm run dev\nDatabase: 127.0.0.1:3307 / mehria_pulao\nData directory: .local/mysql/data (do not delete)\nThe menu is seeded but unapproved. Ordering is intentionally disabled.\n`;
    const accessFile = join(privateRoot, "admin-access.txt");
    await writeFile(accessFile, credentials, { flag: "wx", mode: 0o600 });
    await protect(accessFile);
    await writeFile(join(mysqlRoot, "application.env"), envText({ DATABASE_URL: url("mehria_app", state.appPassword), APP_URL: "http://localhost:3000", DB_SSL: "false", RATE_LIMIT_SECRET: state.rateSecret, ADMIN_AUTH_SECRET: state.authSecret, ORDERING_ENABLED: "false", DELIVERY_AREAS: "", DELIVERY_FEE_PAISA: "0" }), { mode: 0o600, flag: "wx" });
    await protect(join(mysqlRoot, "application.env"));
    await rm(join(mysqlRoot, "bootstrap.sql"));
    // Rename only after initialization succeeds; Next can reload the completed file without stopping port 3000.
    if (await exists(envFile)) throw new Error("Configuration appeared during setup. Refusing to replace it.");
    await rename(join(mysqlRoot, "application.env"), envFile);
    console.log("Setup complete: separate MySQL database, least-privilege runtime login, private admin account, and security secrets configured.");
    console.log("Admin email: admin@mehria.local. Password is in .local/admin-access.txt (not printed).");
    console.log("All menu items remain unapproved; ordering remains disabled. Port 3000 was not stopped.");
  } finally { await getPool()?.end(); }
}

async function main() {
  if (process.platform !== "win32" || !["--prepare", "--finish"].includes(process.argv[2]) || process.argv.length !== 3) throw new Error("Use --prepare or --finish on Windows.");
  if (process.argv[2] === "--prepare") await prepare(); else await finish();
}
main().catch(() => { console.error("Local setup stopped safely. Inspect protected local setup logs/configuration; existing application credentials were not replaced. No secrets are printed."); process.exitCode = 1; });
