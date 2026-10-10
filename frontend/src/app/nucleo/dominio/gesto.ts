/**
 * Dominio del frontend: qué es un gesto y qué devuelve un reconocedor.
 * No depende de Angular, de la cámara ni de MediaPipe.
 */

/** Etiquetas que usa el modelo (SRS §3). */
export const CODIGOS_GESTO = [
  'Open_Palm',
  'Closed_Fist',
  'Pointing_Up',
  'Victory',
  'Thumb_Up',
  'Thumb_Down',
  'ILoveYou',
] as const;
export type CodigoGesto = (typeof CODIGOS_GESTO)[number];

/** El modelo responde "None" cuando ve una mano pero no un gesto conocido. */
export const CODIGO_NINGUNO = 'None';

export type Mano = 'Izquierda' | 'Derecha';

/** Un punto de la mano, en coordenadas normalizadas (0 a 1) sobre la imagen. */
export interface Punto {
  x: number;
  y: number;
  z: number;
}

/** Lo que entrega un reconocedor por cada imagen en la que ve una mano. */
export interface ResultadoReconocimiento {
  /** Código del gesto, o "None". */
  codigo: string;
  /** Confianza del modelo, de 0 a 1. */
  confianza: number;
  mano: Mano;
  /** Los 21 puntos de la mano (vacío si el reconocedor no los entrega). */
  puntos: Punto[];
}

/** Cómo se unen los 21 puntos de la mano para dibujar el esqueleto. */
export const CONEXIONES_MANO: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4], // pulgar
  [0, 5], [5, 6], [6, 7], [7, 8], // índice
  [5, 9], [9, 10], [10, 11], [11, 12], // medio
  [9, 13], [13, 14], [14, 15], [15, 16], // anular
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20], // meñique y palma
];

export interface InfoGesto {
  codigo: CodigoGesto;
  icono: string;
  nombre: string;
  comoSeHace: string;
  consejo: string;
}

/** Guía visual de los 7 gestos (RF-13). */
export const GUIA_GESTOS: readonly InfoGesto[] = [
  { codigo: 'Open_Palm', icono: '🖐️', nombre: 'Palma abierta', comoSeHace: 'Mano abierta con los cinco dedos extendidos.', consejo: 'Muestra la palma de frente, sin juntar los dedos.' },
  { codigo: 'Closed_Fist', icono: '✊', nombre: 'Puño cerrado', comoSeHace: 'Todos los dedos cerrados.', consejo: 'Que se vean los nudillos; no escondas el pulgar.' },
  { codigo: 'Pointing_Up', icono: '☝️', nombre: 'Índice arriba', comoSeHace: 'Solo el índice extendido hacia arriba.', consejo: 'Mantén los otros dedos bien cerrados para no confundirlo con victoria.' },
  { codigo: 'Victory', icono: '✌️', nombre: 'Victoria', comoSeHace: 'Índice y medio abiertos en V.', consejo: 'Separa bien los dos dedos.' },
  { codigo: 'Thumb_Up', icono: '👍', nombre: 'Pulgar arriba', comoSeHace: 'Puño con el pulgar hacia arriba.', consejo: 'Pon la mano de lado, con el pulgar bien vertical.' },
  { codigo: 'Thumb_Down', icono: '👎', nombre: 'Pulgar abajo', comoSeHace: 'Puño con el pulgar hacia abajo.', consejo: 'Gira la muñeca hasta que el pulgar apunte al suelo.' },
  { codigo: 'ILoveYou', icono: '🤟', nombre: 'Te quiero', comoSeHace: 'Pulgar, índice y meñique extendidos.', consejo: 'Medio y anular doblados contra la palma.' },
];

export function infoGesto(codigo: string): InfoGesto | undefined {
  return GUIA_GESTOS.find((g) => g.codigo === codigo);
}
