-- =====================================================================
-- GestoWeb · 02_funciones_triggers.sql
-- Triggers, procedimientos y función de la SRS §9.3.
-- Responsable: Terry
--
-- Código de error propio: GW001 = "la sesión ya está cerrada".
-- El adaptador PostgreSQL del backend lo traduce a un error de dominio.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Trigger trg_asignaciones_iniciales
-- Al crear un usuario, le copia la acción por defecto de los 7 gestos.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_trg_asignaciones_iniciales()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO asignaciones (id_usuario, id_gesto, id_accion)
    SELECT NEW.id_usuario, g.id_gesto, g.id_accion_predeterminada
    FROM gestos g;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_asignaciones_iniciales ON usuarios;
CREATE TRIGGER trg_asignaciones_iniciales
AFTER INSERT ON usuarios
FOR EACH ROW EXECUTE FUNCTION fn_trg_asignaciones_iniciales();

-- ---------------------------------------------------------------------
-- Trigger trg_contar_detecciones
-- Al guardar una detección suma 1 al total de su sesión
-- (y resta 1 si alguna vez se borra, para que el total no mienta).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_trg_contar_detecciones()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE sesiones_reconocimiento
           SET total_detecciones = total_detecciones + 1
         WHERE id_sesion = NEW.id_sesion;
        RETURN NEW;
    ELSE
        UPDATE sesiones_reconocimiento
           SET total_detecciones = GREATEST(total_detecciones - 1, 0)
         WHERE id_sesion = OLD.id_sesion;
        RETURN OLD;
    END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_contar_detecciones ON detecciones;
CREATE TRIGGER trg_contar_detecciones
AFTER INSERT OR DELETE ON detecciones
FOR EACH ROW EXECUTE FUNCTION fn_trg_contar_detecciones();

-- ---------------------------------------------------------------------
-- Trigger trg_validar_sesion_abierta
-- Rechaza detecciones si la sesión ya está cerrada.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_trg_validar_sesion_abierta()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_fecha_fin TIMESTAMP;
BEGIN
    SELECT fecha_fin INTO v_fecha_fin
      FROM sesiones_reconocimiento
     WHERE id_sesion = NEW.id_sesion;

    IF v_fecha_fin IS NOT NULL THEN
        RAISE EXCEPTION 'La sesión de reconocimiento % ya está cerrada', NEW.id_sesion
            USING ERRCODE = 'GW001';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_sesion_abierta ON detecciones;
CREATE TRIGGER trg_validar_sesion_abierta
BEFORE INSERT ON detecciones
FOR EACH ROW EXECUTE FUNCTION fn_trg_validar_sesion_abierta();

-- ---------------------------------------------------------------------
-- Trigger auxiliar: actualiza fecha_actualizacion de asignaciones
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_trg_asignaciones_fecha()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.fecha_actualizacion := NOW() AT TIME ZONE 'UTC';
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_asignaciones_fecha ON asignaciones;
CREATE TRIGGER trg_asignaciones_fecha
BEFORE UPDATE ON asignaciones
FOR EACH ROW EXECUTE FUNCTION fn_trg_asignaciones_fecha();

-- ---------------------------------------------------------------------
-- Procedimiento sp_abrir_sesion
-- Cierra cualquier sesión abierta del usuario y abre una nueva.
-- Una sesión que quedó abierta (pestaña cerrada sin apagar la cámara,
-- flujo 9a de CU-03) se cierra con la hora de su última detección.
-- Uso: CALL sp_abrir_sesion(5, 'Chrome 129', NULL);  -> devuelve p_id_sesion
-- ---------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_abrir_sesion(
    p_id_usuario  INTEGER,
    p_navegador   VARCHAR,
    INOUT p_id_sesion INTEGER DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE sesiones_reconocimiento s
       SET fecha_fin = GREATEST(
               s.fecha_inicio,
               (SELECT MAX(d.fecha_hora) FROM detecciones d WHERE d.id_sesion = s.id_sesion))
     WHERE s.id_usuario = p_id_usuario
       AND s.fecha_fin IS NULL;

    INSERT INTO sesiones_reconocimiento (id_usuario, navegador)
    VALUES (p_id_usuario, LEFT(p_navegador, 100))
    RETURNING id_sesion INTO p_id_sesion;
END;
$$;

-- ---------------------------------------------------------------------
-- Procedimiento sp_restaurar_asignaciones
-- Devuelve al usuario la configuración inicial de acciones.
-- ---------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_restaurar_asignaciones(p_id_usuario INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO asignaciones (id_usuario, id_gesto, id_accion)
    SELECT p_id_usuario, g.id_gesto, g.id_accion_predeterminada
      FROM gestos g
    ON CONFLICT (id_usuario, id_gesto)
    DO UPDATE SET id_accion = EXCLUDED.id_accion;
END;
$$;

-- ---------------------------------------------------------------------
-- Función fn_estadisticas_usuario
-- Total por gesto y confianza promedio de un usuario entre dos fechas.
-- Devuelve los 7 gestos (con 0 si no se usaron) para que los gráficos
-- siempre tengan las mismas barras. Fechas NULL = sin límite.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_estadisticas_usuario(
    p_id_usuario INTEGER,
    p_desde      TIMESTAMP DEFAULT NULL,
    p_hasta      TIMESTAMP DEFAULT NULL
)
RETURNS TABLE (
    id_gesto            INTEGER,
    codigo              VARCHAR,
    nombre              VARCHAR,
    total               BIGINT,
    confianza_promedio  NUMERIC
)
LANGUAGE sql
STABLE
AS $$
    SELECT g.id_gesto,
           g.codigo,
           g.nombre,
           COUNT(d.id_deteccion)                         AS total,
           COALESCE(ROUND(AVG(d.confianza), 3), 0)       AS confianza_promedio
      FROM gestos g
      LEFT JOIN (
            SELECT d.*
              FROM detecciones d
              JOIN sesiones_reconocimiento s ON s.id_sesion = d.id_sesion
             WHERE s.id_usuario = p_id_usuario
               AND (p_desde IS NULL OR d.fecha_hora >= p_desde)
               AND (p_hasta IS NULL OR d.fecha_hora <  p_hasta)
           ) d ON d.id_gesto = g.id_gesto
     GROUP BY g.id_gesto, g.codigo, g.nombre
     ORDER BY g.id_gesto;
$$;
