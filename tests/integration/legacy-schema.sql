CREATE TABLE IF NOT EXISTS menu_items (
  id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(1000) NOT NULL,
  category ENUM('Pulao', 'From the kitchen', 'Sides & sweets') NOT NULL,
  price_paisa INT UNSIGNED NOT NULL,
  image VARCHAR(500) NOT NULL,
  image_alt VARCHAR(300) NOT NULL,
  badge VARCHAR(80) NULL,
  portion VARCHAR(120) NOT NULL,
  available BOOLEAN NOT NULL DEFAULT FALSE,
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
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
  status ENUM('pending') NOT NULL DEFAULT 'pending',
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
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
  CONSTRAINT order_items_menu_fk FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  phone_hash BINARY(32) NOT NULL PRIMARY KEY,
  window_started_at DATETIME(6) NOT NULL,
  request_count INT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
