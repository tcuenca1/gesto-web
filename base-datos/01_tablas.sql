-- =====================================================================
-- GestoWeb · 01_tablas.sql
-- Creación de las 8 tablas, llaves, restricciones e índices (SRS §9).
-- Responsable: Terry
--
-- El script se puede ejecutar varias veces: primero borra lo que exista.
-- Todas las fechas se guardan en UTC (la conexión del backend fija
-- timezone=UTC); la zona horaria del usuario se aplica al consultar.
-- =====================================================================

DROP VIEW  IF EXISTS v_estadisticas_generales CASCADE;
DROP VIEW  IF EXISTS v_historial CASCADE;
DROP TABLE IF EXISTS bitacora CASCADE;
DROP TABLE IF EXISTS detecciones CASCADE;
DROP TABLE IF EXISTS sesiones_reconocimiento CASCADE;
DROP TABLE IF EXISTS asignaciones CASCADE;
DROP TABLE IF EXISTS gestos CASCADE;
DROP TABLE IF EXISTS acciones CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- ---------------------------------------------------------------------
-- roles: USUARIO y ADMIN
-- ---------------------------------------------------------------------
CREATE TABLE roles (
    id_rol       SERIAL       PRIMARY KEY,
    nombre       VARCHAR(20)  NOT NULL UNIQUE,
    descripcion  VARCHAR(150),
    CONSTRAINT ck_roles_nombre CHECK (nombre IN ('USUARIO', 'ADMIN'))
);

-- ---------------------------------------------------------------------
-- usuarios: cuentas de las personas
-- id_rol = 1 corresponde a USUARIO (lo garantiza 04_datos_iniciales.sql)
-- ---------------------------------------------------------------------
CREATE TABLE usuarios (
    id_usuario       SERIAL        PRIMARY KEY,
    nombre           VARCHAR(80)   NOT NULL,
    correo           VARCHAR(120)  NOT NULL UNIQUE,
    contrasena_hash  VARCHAR(100)  NOT NULL,
    id_rol           INTEGER       NOT NULL DEFAULT 1 REFERENCES roles (id_rol),
    activo           BOOLEAN       NOT NULL DEFAULT TRUE,
    fecha_registro   TIMESTAMP     NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    ultimo_acceso    TIMESTAMP,
    CONSTRAINT ck_usuarios_nombre CHECK (LENGTH(TRIM(nombre)) > 0),
    CONSTRAINT ck_usuarios_correo CHECK (correo = LOWER(correo) AND correo ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

-- ---------------------------------------------------------------------
-- acciones: lo que puede pasar en el panel de demostración
-- ---------------------------------------------------------------------
CREATE TABLE acciones (
    id_accion    SERIAL        PRIMARY KEY,
    codigo       VARCHAR(30)   NOT NULL UNIQUE,
    nombre       VARCHAR(60)   NOT NULL,
    descripcion  VARCHAR(200),
    activa       BOOLEAN       NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_acciones_codigo CHECK (codigo ~ '^[A-Z][A-Z0-9_]*$')
);

-- ---------------------------------------------------------------------
-- gestos: los 7 gestos del modelo de MediaPipe
-- ---------------------------------------------------------------------
CREATE TABLE gestos (
    id_gesto                  SERIAL        PRIMARY KEY,
    codigo                    VARCHAR(30)   NOT NULL UNIQUE,
    nombre                    VARCHAR(50)   NOT NULL,
    descripcion               VARCHAR(200),
    umbral_confianza          NUMERIC(3,2)  NOT NULL DEFAULT 0.70,
    id_accion_predeterminada  INTEGER       NOT NULL REFERENCES acciones (id_accion),
    activo                    BOOLEAN       NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_gestos_umbral CHECK (umbral_confianza BETWEEN 0 AND 1)
);

-- ---------------------------------------------------------------------
-- asignaciones: qué acción hace cada gesto para cada usuario
-- ---------------------------------------------------------------------
CREATE TABLE asignaciones (
    id_asignacion        SERIAL     PRIMARY KEY,
    id_usuario           INTEGER    NOT NULL REFERENCES usuarios (id_usuario) ON DELETE CASCADE,
    id_gesto             INTEGER    NOT NULL REFERENCES gestos (id_gesto) ON DELETE CASCADE,
    id_accion            INTEGER    NOT NULL REFERENCES acciones (id_accion),
    fecha_actualizacion  TIMESTAMP  NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    CONSTRAINT uq_asignaciones_usuario_gesto UNIQUE (id_usuario, id_gesto)
);

-- ---------------------------------------------------------------------
-- sesiones_reconocimiento: cada vez que alguien enciende y apaga la cámara
-- ---------------------------------------------------------------------
CREATE TABLE sesiones_reconocimiento (
    id_sesion          SERIAL        PRIMARY KEY,
    id_usuario         INTEGER       NOT NULL REFERENCES usuarios (id_usuario) ON DELETE CASCADE,
    fecha_inicio       TIMESTAMP     NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    fecha_fin          TIMESTAMP,
    navegador          VARCHAR(100),
    total_detecciones  INTEGER       NOT NULL DEFAULT 0,
    CONSTRAINT ck_sesiones_fechas CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio),
    CONSTRAINT ck_sesiones_total  CHECK (total_detecciones >= 0)
);

-- ---------------------------------------------------------------------
-- detecciones: una fila por cada gesto aceptado (nunca imágenes)
-- ---------------------------------------------------------------------
CREATE TABLE detecciones (
    id_deteccion  BIGSERIAL     PRIMARY KEY,
    id_sesion     INTEGER       NOT NULL REFERENCES sesiones_reconocimiento (id_sesion) ON DELETE CASCADE,
    id_gesto      INTEGER       NOT NULL REFERENCES gestos (id_gesto),
    id_accion     INTEGER       REFERENCES acciones (id_accion),
    confianza     NUMERIC(4,3)  NOT NULL,
    mano          VARCHAR(10)   NOT NULL,
    fecha_hora    TIMESTAMP     NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    CONSTRAINT ck_detecciones_confianza CHECK (confianza BETWEEN 0 AND 1),
    CONSTRAINT ck_detecciones_mano      CHECK (mano IN ('Izquierda', 'Derecha'))
);

-- ---------------------------------------------------------------------
-- bitacora: cambios hechos por administradores
-- ---------------------------------------------------------------------
CREATE TABLE bitacora (
    id_bitacora     BIGSERIAL    PRIMARY KEY,
    id_usuario      INTEGER      NOT NULL REFERENCES usuarios (id_usuario),
    tabla_afectada  VARCHAR(40)  NOT NULL,
    operacion       VARCHAR(10)  NOT NULL,
    detalle         JSONB,
    fecha_hora      TIMESTAMP    NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    CONSTRAINT ck_bitacora_operacion CHECK (operacion IN ('INSERT', 'UPDATE', 'DELETE'))
);

-- ---------------------------------------------------------------------
-- Índices (SRS §9.4): aceleran historial y estadísticas
-- ---------------------------------------------------------------------
CREATE INDEX ix_detecciones_sesion     ON detecciones (id_sesion);
CREATE INDEX ix_detecciones_fecha_hora ON detecciones (fecha_hora);
CREATE INDEX ix_sesiones_usuario       ON sesiones_reconocimiento (id_usuario);
-- Extra: búsqueda rápida de la sesión abierta de un usuario
CREATE INDEX ix_sesiones_abiertas      ON sesiones_reconocimiento (id_usuario) WHERE fecha_fin IS NULL;
CREATE INDEX ix_bitacora_fecha_hora    ON bitacora (fecha_hora DESC);
