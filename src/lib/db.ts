import { createPool, type Pool, type PoolConnection } from "mysql2/promise";

let pool: Pool | undefined;

export function getPool(): Pool | null {
  if (!process.env.DATABASE_URL?.trim()) return null;
  if (pool) return pool;

  const url = new URL(process.env.DATABASE_URL);
  const database = decodeURIComponent(url.pathname.slice(1));
  if (
    url.protocol !== "mysql:" ||
    !url.hostname ||
    !database ||
    database.includes("/")
  ) {
    throw new Error("DATABASE_URL must identify an existing MySQL database.");
  }

  pool = createPool({
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    // URL query parameters cannot disable certificate checks or enable multi-statements.
    ssl:
      process.env.DB_SSL === "true"
        ? { rejectUnauthorized: true, verifyIdentity: true }
        : undefined,
    multipleStatements: false,
    connectionLimit: 5,
    waitForConnections: true,
    queueLimit: 20,
    connectTimeout: 5_000,
    enableKeepAlive: true,
    charset: "utf8mb4",
    timezone: "Z",
  });
  // mysql2's timezone option only converts JS values. Queue this before the pool
  // hands out each new connection so SQL defaults also use UTC, never host time.
  pool.pool.on("connection", (connection) => {
    connection.query("SET SESSION time_zone = '+00:00'", (error) => {
      if (error) connection.destroy();
    });
  });
  return pool;
}

export async function withTransaction<T>(work: (connection: PoolConnection) => Promise<T>): Promise<T> {
  const database = getPool();
  if (!database) throw new Error("Database is not configured.");
  const connection = await database.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try { await connection.rollback(); } catch { connection.destroy(); }
    throw error;
  } finally { connection.release(); }
}
