import { randomBytes, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { chmod, readFile, realpath, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";

export type IntegrationFixture = {
  id: string;
  adminEmail: string;
  adminPassword: string;
  authSecret: string;
  rateSecret: string;
  adminCookie?: string;
  csrfToken?: string;
};

async function protectFixture(file: string) {
  await chmod(file, 0o600);
  if (process.platform === "win32") {
    if (!process.env.USERDOMAIN || !process.env.USERNAME) throw new Error("Cannot identify the private fixture owner.");
    await promisify(execFile)("icacls", [file, "/inheritance:r", "/grant:r", `${process.env.USERDOMAIN}\\${process.env.USERNAME}:(F)`, "*S-1-5-18:(F)"]);
  }
}

export async function configureIntegration() {
  if (process.env.TEST_INTEGRATION !== "1") throw new Error("Opt in with TEST_INTEGRATION=1.");
  const { DB_HOST: host, DB_PORT: port, DB_NAME: database, DB_USER: user, DB_PASSWORD: password } = process.env;
  if (host !== "127.0.0.1" || port !== "3308" || database !== "mehria_test" || !user || !password) throw new Error("Use only the explicitly prepared 127.0.0.1:3308/mehria_test database.");
  const file = process.env.TEST_FIXTURE_PATH;
  if (!file || !isAbsolute(file)) throw new Error("Set TEST_FIXTURE_PATH to a private file inside the Kilo temporary directory.");
  const parent = await realpath(dirname(file));
  const allowed = await realpath(join(tmpdir(), "kilo"));
  const within = relative(allowed, parent);
  if (within.startsWith("..") || isAbsolute(within)) throw new Error("Test fixture must remain inside the approved temporary directory.");
  let fixture: IntegrationFixture;
  try { fixture = JSON.parse(await readFile(file, "utf8")); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    fixture = { id: randomUUID(), adminEmail: "integration-admin@example.test", adminPassword: randomBytes(24).toString("base64url"), authSecret: randomBytes(32).toString("hex"), rateSecret: randomBytes(32).toString("hex") };
    await writeFile(file, JSON.stringify(fixture), { mode: 0o600, flag: "wx" });
  }
  await protectFixture(file);
  if (!fixture.id || fixture.authSecret.length < 32 || fixture.rateSecret.length < 32 || fixture.adminPassword.length < 12) throw new Error("Invalid private test fixture.");
  const appPort = process.env.TEST_APP_PORT || "3001";
  if (!["3001", "3003"].includes(appPort)) throw new Error("Integration may use port3001 or3003 only, never3000.");
  Object.assign(process.env, {
    DATABASE_URL: `mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`,
    DB_SSL: "false", APP_URL: `http://127.0.0.1:${appPort}`,
    ADMIN_AUTH_SECRET: fixture.authSecret, RATE_LIMIT_SECRET: fixture.rateSecret,
    ORDERING_ENABLED: "false", DELIVERY_AREAS: "", DELIVERY_FEE_PAISA: "0",
    NEXT_DIST_DIR: ".next-integration", NEXT_TELEMETRY_DISABLED: "1",
  });
  return { file, fixture, appPort, origin: process.env.APP_URL! };
}

export async function saveIntegrationFixture(file: string, fixture: IntegrationFixture) {
  await writeFile(file, JSON.stringify(fixture), { mode: 0o600 });
  await protectFixture(file);
}
