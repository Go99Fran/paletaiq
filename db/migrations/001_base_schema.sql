-- Esquema base de PaletaIQ (sección 7.4 del brief, ajustado a la data real importada
-- desde el catálogo existente: shape incluye 'hybrid', paddles conserva raw_data y el
-- flag de validación humana, y existe paddle_source_links para matchear fuentes externas).

-- Marcas
CREATE TABLE brands (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  logo_url VARCHAR(500) NULL,
  website_url VARCHAR(500) NULL,
  country VARCHAR(3) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Paletas (specs canónicas normalizadas)
CREATE TABLE paddles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  brand_id INT UNSIGNED NOT NULL,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  year SMALLINT UNSIGNED NULL,
  shape ENUM('round','teardrop','diamond','hybrid') NULL,
  balance ENUM('low','medium','high') NULL,
  weight_min SMALLINT UNSIGNED NULL,            -- gramos
  weight_max SMALLINT UNSIGNED NULL,
  core_material VARCHAR(120) NULL,              -- EVA soft/hard, FOAM, etc.
  face_material VARCHAR(120) NULL,              -- carbono 3K/12K/18K, fibra de vidrio
  frame_material VARCHAR(120) NULL,
  surface ENUM('rough','smooth') NULL,
  hardness ENUM('soft','medium','hard') NULL,
  level ENUM('beginner','intermediate','advanced','pro') NULL,
  play_style ENUM('control','balance','power') NULL,
  thickness DECIMAL(4,1) NULL,                  -- mm
  image_url VARCHAR(500) NULL,
  description TEXT NULL,
  raw_data JSON NULL,                           -- parse crudo del scraper, para auditoría
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  validated BOOLEAN NOT NULL DEFAULT FALSE,     -- validación humana desde el admin
  validated_by VARCHAR(255) NULL,
  validated_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_paddles_brand FOREIGN KEY (brand_id) REFERENCES brands(id),
  INDEX idx_paddles_brand (brand_id),
  INDEX idx_paddles_shape (shape),
  INDEX idx_paddles_level (level),
  INDEX idx_paddles_play_style (play_style)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Traducciones de descripción (multiidioma a futuro)
CREATE TABLE paddle_translations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  paddle_id INT UNSIGNED NOT NULL,
  locale CHAR(2) NOT NULL,
  description TEXT NULL,
  UNIQUE KEY uq_paddle_locale (paddle_id, locale),
  CONSTRAINT fk_translations_paddle FOREIGN KEY (paddle_id) REFERENCES paddles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tiendas (argentinas y oficiales de marca)
CREATE TABLE stores (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(150) NOT NULL UNIQUE,
  website_url VARCHAR(500) NULL,
  logo_url VARCHAR(500) NULL,
  country VARCHAR(3) NOT NULL DEFAULT 'ARG',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Historial de precios (cada scrape inserta una fila nueva)
CREATE TABLE prices (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  paddle_id INT UNSIGNED NOT NULL,
  store_id INT UNSIGNED NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'ARS',
  in_stock BOOLEAN NOT NULL DEFAULT TRUE,
  product_url VARCHAR(500) NULL,
  scraped_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_prices_paddle FOREIGN KEY (paddle_id) REFERENCES paddles(id) ON DELETE CASCADE,
  CONSTRAINT fk_prices_store FOREIGN KEY (store_id) REFERENCES stores(id),
  INDEX idx_prices_history (paddle_id, store_id, scraped_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Precio vigente por (paleta, tienda), desnormalizado para listados y filtros rápidos.
-- El scraper lo upsertea en cada corrida; el historial queda en prices.
CREATE TABLE current_prices (
  paddle_id INT UNSIGNED NOT NULL,
  store_id INT UNSIGNED NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'ARS',
  in_stock BOOLEAN NOT NULL DEFAULT TRUE,
  product_url VARCHAR(500) NULL,
  scraped_at DATETIME NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (paddle_id, store_id),
  CONSTRAINT fk_current_prices_paddle FOREIGN KEY (paddle_id) REFERENCES paddles(id) ON DELETE CASCADE,
  CONSTRAINT fk_current_prices_store FOREIGN KEY (store_id) REFERENCES stores(id),
  INDEX idx_current_prices_price (currency, price)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Vinculación paleta <-> fuente externa (matching entre catálogos de specs y tiendas).
-- paddle_id NULL = item scrapeado sin matchear todavía (cola de matching en el admin).
CREATE TABLE paddle_source_links (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  paddle_id INT UNSIGNED NULL,
  source VARCHAR(100) NOT NULL,                 -- slug del scraper/fuente
  external_name VARCHAR(300) NOT NULL,          -- nombre tal como aparece en la fuente
  external_url VARCHAR(500) NOT NULL,
  status ENUM('matched','pending','ignored') NOT NULL DEFAULT 'pending',
  matched_by VARCHAR(255) NULL,                 -- email del admin o 'auto'
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_source_url (source, external_url),
  CONSTRAINT fk_source_links_paddle FOREIGN KEY (paddle_id) REFERENCES paddles(id) ON DELETE SET NULL,
  INDEX idx_source_links_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Usuarios (Google OAuth via Auth.js, estrategia JWT: sin tablas de sesión)
CREATE TABLE users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NULL,
  image VARCHAR(500) NULL,
  locale CHAR(2) NOT NULL DEFAULT 'es',
  role ENUM('user','admin') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Perfil del jugador (resultado del chat del buscador)
CREATE TABLE player_profiles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NULL,                    -- NULL si anónimo
  level ENUM('beginner','intermediate','advanced','pro') NOT NULL,
  play_style ENUM('control','balance','power') NOT NULL,
  frequency TINYINT UNSIGNED NULL,              -- veces por semana
  has_injuries BOOLEAN NOT NULL DEFAULT FALSE,
  injury_notes VARCHAR(500) NULL,
  strength_pref ENUM('needs_power','has_power') NULL,
  improve_goal ENUM('power','control','ball_exit','comfort') NULL,
  previous_paddle VARCHAR(300) NULL,
  budget_min DECIMAL(12,2) NULL,
  budget_max DECIMAL(12,2) NULL,
  currency CHAR(3) NOT NULL DEFAULT 'ARS',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_profiles_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Recomendaciones de la IA por perfil
CREATE TABLE recommendations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  player_profile_id INT UNSIGNED NOT NULL,
  paddle_id INT UNSIGNED NOT NULL,
  rank TINYINT UNSIGNED NOT NULL,
  reason TEXT NOT NULL,                         -- explicación de la IA
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_recommendations_profile FOREIGN KEY (player_profile_id) REFERENCES player_profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_recommendations_paddle FOREIGN KEY (paddle_id) REFERENCES paddles(id) ON DELETE CASCADE,
  INDEX idx_recommendations_profile (player_profile_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Observabilidad de scraping
CREATE TABLE scrape_runs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  source VARCHAR(100) NOT NULL,
  status ENUM('running','success','error') NOT NULL DEFAULT 'running',
  trigger_type ENUM('cron','manual_admin','import') NOT NULL DEFAULT 'manual_admin',
  triggered_by VARCHAR(255) NULL,
  started_at DATETIME NOT NULL,
  finished_at DATETIME NULL,
  items_found INT UNSIGNED NOT NULL DEFAULT 0,
  items_created INT UNSIGNED NOT NULL DEFAULT 0,
  items_updated INT UNSIGNED NOT NULL DEFAULT 0,
  error_message TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_scrape_runs_source (source, started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
