-- Señales avanzadas del perfil de jugador para recomendaciones más precisas
ALTER TABLE player_profiles
  ADD COLUMN match_pace ENUM('calm','medium','fast') NULL AFTER frequency,
  ADD COLUMN injury_area ENUM('elbow','shoulder','wrist') NULL AFTER has_injuries,
  ADD COLUMN sweet_spot_tolerance ENUM('wide','balanced','small') NULL AFTER improve_goal;
