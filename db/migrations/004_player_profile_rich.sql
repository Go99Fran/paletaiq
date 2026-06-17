-- Campos del perfil enriquecido del buscador adaptativo ("Elegí mi paleta").
-- Multi-valor como JSON (injury_areas, improve_goals, previous_pains, brand_slugs);
-- el resto enum/varchar. Las columnas viejas injury_area/improve_goal quedan por
-- compatibilidad de datos históricos pero ya no se escriben.
ALTER TABLE player_profiles
  ADD COLUMN body_profile ENUM('light','medium','strong') NULL AFTER play_style,
  ADD COLUMN journey ENUM('first','upgrade','enthusiast') NULL AFTER body_profile,
  ADD COLUMN injury_areas JSON NULL AFTER injury_area,
  ADD COLUMN improve_goals JSON NULL AFTER improve_goal,
  ADD COLUMN durability ENUM('high','medium') NULL AFTER sweet_spot_tolerance,
  ADD COLUMN balance_pref ENUM('low','medium','high') NULL AFTER durability,
  ADD COLUMN hardness_pref ENUM('soft','medium','hard') NULL AFTER balance_pref,
  ADD COLUMN face_pref ENUM('fiberglass','carbon3k','carbon12k','carbon18k') NULL AFTER hardness_pref,
  ADD COLUMN spin_important TINYINT(1) NOT NULL DEFAULT 0 AFTER face_pref,
  ADD COLUMN previous_pains JSON NULL AFTER previous_paddle,
  ADD COLUMN brand_slugs JSON NULL AFTER previous_pains,
  ADD COLUMN free_text VARCHAR(1000) NULL AFTER brand_slugs;
