-- =====================================================================
-- GestoWeb · 03_vistas.sql
-- Vistas para historial y estadísticas (SRS §9.3).
-- Responsable: Terry
-- =====================================================================

-- ---------------------------------------------------------------------
-- v_historial: detecciones con nombre del gesto, acción y usuario,
-- lista para mostrar en la pantalla Historial y exportar a CSV.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_historial AS
SELECT d.id_deteccion,
       d.id_sesion,
       s.id_usuario,
       u.nombre      AS nombre_usuario,
       g.id_gesto,
       g.codigo      AS codigo_gesto,
       g.nombre      AS nombre_gesto,
       a.id_accion,
       a.codigo      AS codigo_accion,
       a.nombre      AS nombre_accion,
       d.confianza,
       d.mano,
       d.fecha_hora
  FROM detecciones d
  JOIN sesiones_reconocimiento s ON s.id_sesion  = d.id_sesion
  JOIN usuarios u                ON u.id_usuario = s.id_usuario
  JOIN gestos g                  ON g.id_gesto   = d.id_gesto
  LEFT JOIN acciones a           ON a.id_accion  = d.id_accion;

-- ---------------------------------------------------------------------
-- v_estadisticas_generales: uso de cada gesto en todo el sistema,
-- para el panel del administrador.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_estadisticas_generales AS
SELECT g.id_gesto,
       g.codigo,
       g.nombre,
       g.activo,
       COUNT(d.id_deteccion)                        AS total_detecciones,
       COALESCE(ROUND(AVG(d.confianza), 3), 0)      AS confianza_promedio,
       COUNT(DISTINCT s.id_usuario)                 AS usuarios_distintos,
       MAX(d.fecha_hora)                            AS ultima_deteccion
  FROM gestos g
  LEFT JOIN detecciones d             ON d.id_gesto  = g.id_gesto
  LEFT JOIN sesiones_reconocimiento s ON s.id_sesion = d.id_sesion
 GROUP BY g.id_gesto, g.codigo, g.nombre, g.activo
 ORDER BY g.id_gesto;
