-- =====================================================================
-- GestoWeb · 05_version_token.sql
-- Migración para bases creadas antes de que existiera usuarios.version_token
-- (invalidar tokens al cerrar sesión, RNF-07). Es idempotente: en una base
-- recién creada con 01_tablas.sql no cambia nada.
-- Uso en una base existente:  psql "$DATABASE_URL" -f base-datos/05_version_token.sql
-- =====================================================================

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS version_token INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_usuarios_version_token') THEN
        ALTER TABLE usuarios ADD CONSTRAINT ck_usuarios_version_token CHECK (version_token >= 0);
    END IF;
END;
$$;
