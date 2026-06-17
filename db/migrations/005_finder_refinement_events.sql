-- Historial de refinamiento del buscador para análisis de UX y mejora de algoritmo.
CREATE TABLE finder_refinement_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  player_profile_id INT UNSIGNED NOT NULL,
  iteration TINYINT UNSIGNED NOT NULL,
  shown_paddle_ids JSON NOT NULL,
  exclude_brand_slugs JSON NULL,
  want_more_power BOOLEAN NOT NULL DEFAULT FALSE,
  want_more_control BOOLEAN NOT NULL DEFAULT FALSE,
  want_cheaper BOOLEAN NOT NULL DEFAULT FALSE,
  want_lighter BOOLEAN NOT NULL DEFAULT FALSE,
  new_budget_max DECIMAL(12,2) NULL,
  free_feedback VARCHAR(900) NULL,
  result_count TINYINT UNSIGNED NOT NULL DEFAULT 0,
  selected_paddle_id INT UNSIGNED NULL,
  locale CHAR(2) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_finder_refinement_profile
    FOREIGN KEY (player_profile_id) REFERENCES player_profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_finder_refinement_selected
    FOREIGN KEY (selected_paddle_id) REFERENCES paddles(id) ON DELETE SET NULL,
  INDEX idx_refinement_profile_iter (player_profile_id, iteration),
  INDEX idx_refinement_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
