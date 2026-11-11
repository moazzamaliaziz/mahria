import assert from "node:assert/strict";
import { after, test } from "node:test";
import { getPool } from "../src/lib/db";

const previous = process.env.DATABASE_URL;
process.env.DATABASE_URL = "mysql://unused:unused@127.0.0.1:3308/mehria_test";
const pool = getPool()!;
after(async () => {
  await pool.end();
  if (previous === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = previous;
});

test("every new pooled connection queues UTC initialization synchronously", () => {
  for (let index = 0; index < 3; index++) {
    let initialized = false;
    pool.pool.emit("connection", {
      query(sql: string, callback: (error: Error | null) => void) {
        assert.equal(sql, "SET SESSION time_zone = '+00:00'");
        initialized = true;
        callback(null);
      },
      destroy() { assert.fail("Successful UTC initialization must not destroy the connection."); },
    });
    assert.equal(initialized, true, "SET must be queued before a connection can be acquired.");
  }
});

test("failed UTC initialization destroys the connection instead of using local time", () => {
  let destroyed = false;
  pool.pool.emit("connection", {
    query(_sql: string, callback: (error: Error) => void) { callback(new Error("Injected initialization failure")); },
    destroy() { destroyed = true; },
  });
  assert.equal(destroyed, true);
});
