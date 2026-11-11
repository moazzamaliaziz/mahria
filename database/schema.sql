CREATE TABLE IF NOT EXISTS menu_items (
  id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  name_ur VARCHAR(120) NOT NULL DEFAULT '',
  description VARCHAR(1000) NOT NULL,
  description_ur VARCHAR(1000) NOT NULL DEFAULT '',
  category ENUM('Pulao', 'From the kitchen', 'Sides & sweets') NOT NULL,
  price_paisa INT UNSIGNED NOT NULL,
  image VARCHAR(500) NOT NULL,
  image_alt VARCHAR(300) NOT NULL,
  badge VARCHAR(80) NULL,
  portion VARCHAR(120) NOT NULL,
  available BOOLEAN NOT NULL DEFAULT FALSE,
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  INDEX menu_approved_available (approved, available),
  CHECK (price_paisa > 0 AND price_paisa <= 2147483647),
  CHECK (available IN (0, 1)),
  CHECK (approved IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  reference VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  idempotency_key VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  request_hash BINARY(32) NOT NULL,
  customer_name VARCHAR(80) NOT NULL,
  phone VARCHAR(16) NOT NULL,
  fulfillment ENUM('pickup', 'delivery') NOT NULL DEFAULT 'pickup',
  area VARCHAR(120) NULL,
  address VARCHAR(300) NULL,
  notes VARCHAR(500) NULL,
  subtotal_paisa INT UNSIGNED NOT NULL,
  delivery_fee_paisa INT UNSIGNED NOT NULL,
  total_paisa INT UNSIGNED NOT NULL,
  status ENUM('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
  payment_method ENUM('cod') NOT NULL DEFAULT 'cod',
  payment_status ENUM('unpaid', 'collected') NOT NULL DEFAULT 'unpaid',
  version INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  completed_at DATETIME(6) NULL,
  INDEX orders_created (created_at),
  INDEX orders_status_created (status, created_at),
  CONSTRAINT orders_cod_only CHECK (payment_method = 'cod'),
  CONSTRAINT orders_cash_completion CHECK ((status = 'completed' AND payment_status = 'collected' AND completed_at IS NOT NULL) OR (status <> 'completed' AND payment_status = 'unpaid' AND completed_at IS NULL)),
  CHECK (total_paisa = subtotal_paisa + delivery_fee_paisa),
  CHECK (total_paisa <= 2147483647)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_items (
  order_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  menu_item_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  item_name VARCHAR(120) NOT NULL,
  unit_price_paisa INT UNSIGNED NOT NULL,
  quantity TINYINT UNSIGNED NOT NULL,
  line_total_paisa INT UNSIGNED NOT NULL,
  PRIMARY KEY (order_id, menu_item_id),
  CONSTRAINT order_items_order_fk FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT,
  CONSTRAINT order_items_menu_fk FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE RESTRICT,
  CHECK (quantity BETWEEN 1 AND 20),
  CHECK (unit_price_paisa > 0),
  CHECK (line_total_paisa = unit_price_paisa * quantity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  phone_hash BINARY(32) NOT NULL PRIMARY KEY,
  window_started_at DATETIME(6) NOT NULL,
  request_count INT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admins (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(254) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL UNIQUE,
  password_hash VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  disabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CHECK (disabled IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash BINARY(32) NOT NULL PRIMARY KEY,
  admin_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  expires_at DATETIME(6) NOT NULL,
  INDEX admin_sessions_expiry (expires_at),
  CONSTRAINT admin_sessions_admin_fk FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_login_buckets (
  bucket_hash BINARY(32) NOT NULL PRIMARY KEY,
  window_started_at DATETIME(6) NOT NULL,
  request_count INT UNSIGNED NOT NULL,
  INDEX admin_login_expiry (window_started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_audit_events (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  admin_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  action VARCHAR(40) CHARACTER SET ascii NOT NULL,
  entity_type VARCHAR(24) CHARACTER SET ascii NOT NULL,
  entity_id VARCHAR(64) CHARACTER SET ascii NOT NULL,
  from_status VARCHAR(24) CHARACTER SET ascii NULL,
  to_status VARCHAR(24) CHARACTER SET ascii NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  INDEX admin_audit_created (created_at),
  INDEX admin_audit_entity (entity_type, entity_id),
  CONSTRAINT admin_audit_admin_fk FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS store_settings (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  ordering_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  delivery_areas JSON NOT NULL,
  delivery_fee_paisa INT UNSIGNED NOT NULL DEFAULT 0,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CHECK (id = 1),
  CHECK (ordering_enabled IN (0, 1)),
  CHECK (delivery_fee_paisa <= 2147483647)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
