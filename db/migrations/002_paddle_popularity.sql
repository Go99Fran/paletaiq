-- Score de popularidad/relevancia editorial (1=nicho, 5=muy usada/icónica).
-- No se scrapea: lo seteamos nosotros (admin o seed) para que el recomendador y
-- el listado prioricen las paletas que la gente realmente usa, en vez de inflar
-- marcas con muchos modelos en catálogo (ej. Adidas) que no son tan populares.
ALTER TABLE paddles
  ADD COLUMN popularity TINYINT UNSIGNED NOT NULL DEFAULT 3
  AFTER play_style;

-- Índice para ordenar/filtrar por relevancia rápido.
CREATE INDEX idx_paddles_popularity ON paddles (popularity);
