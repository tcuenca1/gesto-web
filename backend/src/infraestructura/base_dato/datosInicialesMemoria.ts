import { EstadoMemoria } from './AlmacenMemoria';

/**
 * Los mismos datos iniciales de base-datos/04_datos_iniciales.sql:
 * 8 acciones, 7 gestos y el administrador de prueba (admin@gestoweb.local / Admin123!).
 */
export function datosInicialesMemoria(ahora = new Date()): EstadoMemoria {
  const acciones = [
    ['REPRODUCIR_PAUSAR', 'Reproducir o pausar', 'Inicia o pausa el pase automático de imágenes'],
    ['DETENER', 'Detener y volver al inicio', 'Detiene el pase automático y vuelve a la primera imagen'],
    ['SIGUIENTE', 'Siguiente imagen', 'Avanza a la siguiente imagen'],
    ['ANTERIOR', 'Imagen anterior', 'Retrocede a la imagen anterior'],
    ['MARCAR_FAVORITA', 'Marcar como favorita', 'Agrega la imagen actual a favoritas'],
    ['QUITAR_FAVORITA', 'Quitar de favoritas', 'Quita la imagen actual de favoritas'],
    ['CORAZON', 'Reacción de corazón', 'Muestra una reacción de corazón en pantalla'],
    ['NINGUNA', 'Ninguna', 'El gesto se reconoce pero no hace nada'],
  ].map(([codigo, nombre, descripcion], i) => ({ id: i + 1, codigo, nombre, descripcion, activa: true }));

  const gestos = [
    ['Open_Palm', 'Palma abierta', 'Mano abierta, los cinco dedos extendidos'],
    ['Closed_Fist', 'Puño cerrado', 'Todos los dedos cerrados'],
    ['Pointing_Up', 'Índice arriba', 'Solo el índice extendido hacia arriba'],
    ['Victory', 'Victoria', 'Índice y medio abiertos en V'],
    ['Thumb_Up', 'Pulgar arriba', 'Puño con el pulgar hacia arriba'],
    ['Thumb_Down', 'Pulgar abajo', 'Puño con el pulgar hacia abajo'],
    ['ILoveYou', 'Te quiero', 'Pulgar, índice y meñique extendidos'],
  ].map(([codigo, nombre, descripcion], i) => ({
    id: i + 1,
    codigo,
    nombre,
    descripcion,
    umbralConfianza: 0.7,
    idAccionPredeterminada: i + 1,
    activo: true,
  }));

  return {
    acciones,
    gestos,
    usuarios: [
      {
        id: 1,
        nombre: 'Administrador',
        correo: 'admin@gestoweb.local',
        contrasenaHash: '$2b$10$Img7Ka1RnZGULFOlsk2YLuP3VD4bmSf.S8GkXwP0t3FQR6j8paPpW',
        rol: 'ADMIN',
        activo: true,
        fechaRegistro: ahora,
        ultimoAcceso: null,
      },
    ],
    asignaciones: gestos.map((g) => ({ idUsuario: 1, idGesto: g.id, idAccion: g.idAccionPredeterminada, fechaActualizacion: ahora })),
    sesiones: [],
    detecciones: [],
    bitacora: [],
    secuencias: { usuarios: 1, gestos: 7, acciones: 8, sesiones: 0, detecciones: 0, bitacora: 0 },
  };
}
