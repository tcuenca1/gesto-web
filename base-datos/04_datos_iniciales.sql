-- =====================================================================
-- GestoWeb · 04_datos_iniciales.sql
-- 2 roles, 8 acciones, 7 gestos y 1 administrador de prueba (SRS §9.4).
-- Responsable: Terry
-- =====================================================================

-- ---------------------------------------------------------------------
-- Roles (id fijo: usuarios.id_rol tiene DEFAULT 1 = USUARIO)
-- ---------------------------------------------------------------------
INSERT INTO roles (id_rol, nombre, descripcion) VALUES
    (1, 'USUARIO', 'Reconoce gestos, personaliza acciones y ve su historial'),
    (2, 'ADMIN',   'Todo lo del usuario, más gestionar gestos, acciones y usuarios');
SELECT setval('roles_id_rol_seq', (SELECT MAX(id_rol) FROM roles));

-- ---------------------------------------------------------------------
-- Acciones: las 7 de la sección 3 más NINGUNA
-- El "codigo" es lo que entiende el panel de demostración del frontend.
-- ---------------------------------------------------------------------
INSERT INTO acciones (id_accion, codigo, nombre, descripcion) VALUES
    (1, 'REPRODUCIR_PAUSAR', 'Reproducir o pausar',      'Inicia o pausa el pase automático de imágenes'),
    (2, 'DETENER',           'Detener y volver al inicio','Detiene el pase automático y vuelve a la primera imagen'),
    (3, 'SIGUIENTE',         'Siguiente imagen',         'Avanza a la siguiente imagen'),
    (4, 'ANTERIOR',          'Imagen anterior',          'Retrocede a la imagen anterior'),
    (5, 'MARCAR_FAVORITA',   'Marcar como favorita',     'Agrega la imagen actual a favoritas'),
    (6, 'QUITAR_FAVORITA',   'Quitar de favoritas',      'Quita la imagen actual de favoritas'),
    (7, 'CORAZON',           'Reacción de corazón',      'Muestra una reacción de corazón en pantalla'),
    (8, 'NINGUNA',           'Ninguna',                  'El gesto se reconoce pero no hace nada');
SELECT setval('acciones_id_accion_seq', (SELECT MAX(id_accion) FROM acciones));

-- ---------------------------------------------------------------------
-- Gestos: los 7 que trae entrenados MediaPipe Gesture Recognizer
-- ---------------------------------------------------------------------
INSERT INTO gestos (id_gesto, codigo, nombre, descripcion, umbral_confianza, id_accion_predeterminada) VALUES
    (1, 'Open_Palm',   'Palma abierta', 'Mano abierta, los cinco dedos extendidos', 0.70, 1),
    (2, 'Closed_Fist', 'Puño cerrado',  'Todos los dedos cerrados',                 0.70, 2),
    (3, 'Pointing_Up', 'Índice arriba', 'Solo el índice extendido hacia arriba',    0.70, 3),
    (4, 'Victory',     'Victoria',      'Índice y medio abiertos en V',             0.70, 4),
    (5, 'Thumb_Up',    'Pulgar arriba', 'Puño con el pulgar hacia arriba',          0.70, 5),
    (6, 'Thumb_Down',  'Pulgar abajo',  'Puño con el pulgar hacia abajo',           0.70, 6),
    (7, 'ILoveYou',    'Te quiero',     'Pulgar, índice y meñique extendidos',      0.70, 7);
SELECT setval('gestos_id_gesto_seq', (SELECT MAX(id_gesto) FROM gestos));

-- ---------------------------------------------------------------------
-- Administrador de prueba
--   correo:     admin@gestoweb.local
--   contraseña: Admin123!   (cifrada con bcrypt, costo 10)
-- ¡Cambiar la contraseña antes de publicar el sistema!
-- El trigger trg_asignaciones_iniciales le crea sus 7 asignaciones.
-- ---------------------------------------------------------------------
INSERT INTO usuarios (nombre, correo, contrasena_hash, id_rol) VALUES
    ('Administrador', 'admin@gestoweb.local',
     '$2b$10$Img7Ka1RnZGULFOlsk2YLuP3VD4bmSf.S8GkXwP0t3FQR6j8paPpW', 2);
