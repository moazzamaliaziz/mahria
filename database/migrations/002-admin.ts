import type { PoolConnection, RowDataPacket } from "mysql2/promise";

export async function upgradeAdminSchema(connection: PoolConnection) {
  // MySQL DDL commits immediately. Check each step so an interrupted upgrade can safely resume.
  const columns = [
    ["menu_items", "name_ur", "VARCHAR(120) NOT NULL DEFAULT ''"],
    ["menu_items", "description_ur", "VARCHAR(1000) NOT NULL DEFAULT ''"],
    ["menu_items", "version", "INT UNSIGNED NOT NULL DEFAULT 1"],
    ["orders", "payment_method", "ENUM('cod') NOT NULL DEFAULT 'cod'"],
    ["orders", "payment_status", "ENUM('unpaid', 'collected') NOT NULL DEFAULT 'unpaid'"],
    ["orders", "version", "INT UNSIGNED NOT NULL DEFAULT 1"],
    ["orders", "updated_at", "DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)"],
    ["orders", "completed_at", "DATETIME(6) NULL"],
  ];
  for (const [table, name, definition] of columns) {
    const [rows] = await connection.execute<RowDataPacket[]>("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?", [table, name]);
    if (!rows.length) {
      await connection.execute(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
      if (table === "orders" && name === "updated_at") await connection.execute("UPDATE orders SET updated_at = created_at");
    }
  }
  const [status] = await connection.execute<(RowDataPacket & { COLUMN_TYPE: string })[]>("SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'status'");
  if (!status[0].COLUMN_TYPE.includes("'out_for_delivery'")) await connection.execute("ALTER TABLE orders MODIFY COLUMN status ENUM('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled') NOT NULL DEFAULT 'pending'");
  const [indexes] = await connection.execute<RowDataPacket[]>("SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND INDEX_NAME = 'orders_status_created'");
  if (!indexes.length) await connection.execute("ALTER TABLE orders ADD INDEX orders_status_created (status, created_at)");
  for (const [name, condition] of [
    ["orders_cod_only", "payment_method = 'cod'"],
    ["orders_cash_completion", "(status = 'completed' AND payment_status = 'collected' AND completed_at IS NOT NULL) OR (status <> 'completed' AND payment_status = 'unpaid' AND completed_at IS NULL)"],
  ]) {
    const [rows] = await connection.execute<RowDataPacket[]>("SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND CONSTRAINT_NAME = ?", [name]);
    if (!rows.length) await connection.execute(`ALTER TABLE orders ADD CONSTRAINT ${name} CHECK (${condition})`);
  }
}
