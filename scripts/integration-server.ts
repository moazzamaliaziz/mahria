import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { configureIntegration } from "./integration-helpers";

async function main() {
  const { appPort } = await configureIntegration();
  const production = process.env.TEST_PRODUCTION === "1";
  if (production) process.env.NEXT_DIST_DIR = ".next-production";
  // The tracked wrapper keeps Next in the same process tree; it never starts or stops port3000.
  const child = spawn(process.execPath, [resolve("node_modules/next/dist/bin/next"), ...(production ? ["start"] : ["dev", "--webpack"]), "--hostname", "127.0.0.1", "--port", appPort], { stdio: "inherit", env: process.env });
  for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => child.kill(signal));
  child.on("error", () => { console.error("Integration server failed to start."); process.exitCode = 1; });
  child.on("exit", (code) => { process.exitCode = code ?? 1; });
}
main().catch(() => { console.error("Integration server configuration rejected. Check the explicit test environment."); process.exitCode = 1; });
