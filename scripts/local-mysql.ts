import { access } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

async function main() {
  if (process.platform !== "win32") throw new Error("This launcher is for the configured local Windows MySQL installation.");
  const root = fileURLToPath(new URL("../.local/mysql/", import.meta.url));
  const executable = join(root, "server", "bin", "mysqld.exe");
  await access(executable);
  const args = [`--defaults-file=${join(root, "my.ini")}`];
  const bootstrap = join(root, "bootstrap.sql");
  if (await access(bootstrap).then(() => true, () => false)) args.push(`--init-file=${bootstrap}`);
  console.log("Local application MySQL: 127.0.0.1:3307. Data stays in .local/mysql/data.");
  const child = spawn(executable, args, { cwd: root, stdio: "inherit", windowsHide: true });
  for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => child.kill(signal));
  child.on("error", () => { console.error("MySQL could not start. Check the private .local/mysql/mysql-error.log."); process.exitCode = 1; });
  child.on("exit", (code) => { process.exitCode = code ?? 1; });
}

main().catch(() => { console.error("Local MySQL is not configured. See SETUP.md."); process.exitCode = 1; });
