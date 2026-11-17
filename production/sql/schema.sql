-- ============================================================
--  کتاب‌خانه — Production schema (MySQL 8 / MariaDB 10.4+)
--  Run through install.php, or manually:
--    mysql -u USER -p DBNAME < sql/schema.sql
-- ============================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS categories (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug        VARCHAR(64)  NOT NULL,
  title       VARCHAR(120) NOT NULL,
  descr       VARCHAR(255) NOT NULL DEFAULT '',
  glow        VARCHAR(40)  NOT NULL DEFAULT 'rgba(75,145,255,.22)',
  soft        VARCHAR(40)  NOT NULL DEFAULT 'rgba(75,145,255,.10)',
  icon        TEXT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  fullname    VARCHAR(120) NOT NULL,
  phone       VARCHAR(15)  NOT NULL,
  username    VARCHAR(40)  NOT NULL,
  pass_hash   VARCHAR(255) NOT NULL,
  role        ENUM('customer','admin') NOT NULL DEFAULT 'customer',
  status      ENUM('active','blocked') NOT NULL DEFAULT 'active',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_phone (phone),
  UNIQUE KEY uq_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS books (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug         VARCHAR(120) NOT NULL,
  title        VARCHAR(200) NOT NULL,
  author       VARCHAR(160) NOT NULL,
  publisher    VARCHAR(160) NOT NULL DEFAULT '',
  category_id  INT UNSIGNED NOT NULL,
  price        INT UNSIGNED NOT NULL,
  off          TINYINT UNSIGNED NOT NULL DEFAULT 0,
  pages        SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  pub_year     SMALLINT UNSIGNED NULL,
  isbn         VARCHAR(24) NOT NULL DEFAULT '',
  stock        INT NOT NULL DEFAULT 0,
  published_on DATE NOT NULL,
  book_rank    INT NOT NULL DEFAULT 100,
  pal          TINYINT NOT NULL DEFAULT 0,
  orn          TINYINT NOT NULL DEFAULT 0,
  description  TEXT NULL,
  cover_url    VARCHAR(255) NULL,
  active       TINYINT(1) NOT NULL DEFAULT 1,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_books_slug (slug),
  KEY idx_books_category (category_id),
  KEY idx_books_active (active),
  CONSTRAINT fk_books_category FOREIGN KEY (category_id) REFERENCES categories (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS coupons (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code          VARCHAR(32) NOT NULL,
  percent       TINYINT UNSIGNED NOT NULL,
  max_discount  INT UNSIGNED NOT NULL DEFAULT 0,
  min_subtotal  INT UNSIGNED NOT NULL DEFAULT 0,
  expires_at    DATE NOT NULL,
  usage_limit   INT UNSIGNED NOT NULL DEFAULT 1,
  used_count    INT UNSIGNED NOT NULL DEFAULT 0,
  active        TINYINT(1) NOT NULL DEFAULT 1,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_coupons_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  number          VARCHAR(24) NOT NULL,
  user_id         INT UNSIGNED NULL,
  status          ENUM('pending','paid','sent','canceled') NOT NULL DEFAULT 'pending',
  subtotal        INT UNSIGNED NOT NULL DEFAULT 0,
  discount        INT UNSIGNED NOT NULL DEFAULT 0,
  shipping        INT UNSIGNED NOT NULL DEFAULT 0,
  total           INT UNSIGNED NOT NULL DEFAULT 0,
  coupon_code     VARCHAR(32) NULL,
  shipping_method VARCHAR(16) NOT NULL DEFAULT 'post',
  recipient       VARCHAR(120) NOT NULL,
  phone           VARCHAR(15)  NOT NULL,
  province        VARCHAR(60)  NOT NULL,
  city            VARCHAR(60)  NOT NULL,
  address         VARCHAR(400) NOT NULL,
  postal          VARCHAR(10)  NOT NULL,
  note            VARCHAR(300) NULL,
  paid_at         DATETIME NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_number (number),
  KEY idx_orders_user (user_id),
  KEY idx_orders_status (status),
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_items (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id   INT UNSIGNED NOT NULL,
  book_id    INT UNSIGNED NULL,
  title      VARCHAR(200) NOT NULL,
  price      INT UNSIGNED NOT NULL,
  qty        INT UNSIGNED NOT NULL,
  line_total INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  KEY idx_items_order (order_id),
  CONSTRAINT fk_items_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
  CONSTRAINT fk_items_book FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS addresses (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED NOT NULL,
  recipient  VARCHAR(120) NOT NULL,
  phone      VARCHAR(15)  NOT NULL,
  province   VARCHAR(60)  NOT NULL,
  city       VARCHAR(60)  NOT NULL,
  address    VARCHAR(400) NOT NULL,
  postal     VARCHAR(10)  NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_addr_user (user_id),
  CONSTRAINT fk_addr_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payments (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id   INT UNSIGNED NOT NULL,
  gateway    VARCHAR(24) NOT NULL DEFAULT 'zarinpal',
  authority  VARCHAR(120) NOT NULL,
  ref_id     VARCHAR(120) NULL,
  amount     INT UNSIGNED NOT NULL,
  status     ENUM('pending','verified','failed') NOT NULL DEFAULT 'pending',
  raw        TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pay_order (order_id),
  UNIQUE KEY uq_pay_authority (authority),
  CONSTRAINT fk_pay_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sms_log (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  phone      VARCHAR(15) NOT NULL,
  message    VARCHAR(500) NOT NULL,
  provider   VARCHAR(32) NOT NULL DEFAULT 'log',
  status     VARCHAR(24) NOT NULL DEFAULT 'queued',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sms_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS login_attempts (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  identifier VARCHAR(80) NOT NULL,
  ip         VARCHAR(45) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_attempt (identifier, ip, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
