/**
 * Esqueleto de 21 puntos de cada gesto, en la misma numeración que MediaPipe
 * (0 = muñeca; 1-4 pulgar; 5-8 índice; 9-12 medio; 13-16 anular; 17-20 meñique).
 * Se usa para dibujar los íconos de los gestos: así el ícono, el visor de la
 * cámara y la guía muestran la mano de la misma forma.
 *
 * Coordenadas en un lienzo de 100 × 100 (y crece hacia abajo), mano derecha
 * vista de frente.
 */
import { CodigoGesto } from './gesto';

export type PuntoIcono = readonly [number, number];

export interface EsqueletoGesto {
  puntos: PuntoIcono[];
  /** Índices de las puntas de los dedos extendidos (se marcan con el acento). */
  puntas: number[];
}

type Dedo = 'pulgar' | 'indice' | 'medio' | 'anular' | 'menique';

const MUNECA: PuntoIcono = [50, 92];

/** Base (nudillo) de cada dedo largo. */
const BASES: Record<Exclude<Dedo, 'pulgar'>, PuntoIcono> = {
  indice: [36, 53],
  medio: [47, 50],
  anular: [58, 52],
  menique: [68, 57],
};

/** Tres puntos (articulaciones y punta) de un dedo extendido, con apertura opcional. */
const EXTENDIDOS: Record<Exclude<Dedo, 'pulgar'>, PuntoIcono[]> = {
  indice: [[35, 39], [34, 28], [33, 18]],
  medio: [[47, 35], [47, 24], [47, 13]],
  anular: [[59, 38], [60, 28], [61, 20]],
  menique: [[70, 46], [71, 38], [72, 31]],
};

/** Dedo doblado: la punta vuelve hacia la palma. */
const DOBLADOS: Record<Exclude<Dedo, 'pulgar'>, PuntoIcono[]> = {
  indice: [[35, 44], [40, 41], [41, 48]],
  medio: [[47, 41], [52, 38], [53, 45]],
  anular: [[59, 43], [63, 41], [64, 47]],
  menique: [[69, 49], [73, 47], [73, 53]],
};

/** Índice y medio abiertos en V. */
const EN_V: Partial<Record<Dedo, PuntoIcono[]>> = {
  indice: [[32, 39], [28, 28], [24, 18]],
  medio: [[50, 35], [53, 24], [56, 13]],
};

const PULGAR_ABIERTO: PuntoIcono[] = [[38, 82], [29, 73], [22, 64], [16, 56]];
const PULGAR_CRUZADO: PuntoIcono[] = [[39, 82], [32, 72], [37, 63], [45, 60]];
const PULGAR_ARRIBA: PuntoIcono[] = [[37, 80], [29, 67], [26, 50], [26, 31]];

function armar(pulgar: PuntoIcono[], dedos: Partial<Record<Dedo, PuntoIcono[]>>, extendidos: Dedo[]): EsqueletoGesto {
  const largo = (d: Exclude<Dedo, 'pulgar'>) => dedos[d] ?? (extendidos.includes(d) ? EXTENDIDOS[d] : DOBLADOS[d]);
  const puntos: PuntoIcono[] = [
    MUNECA,
    ...pulgar,
    BASES.indice, ...largo('indice'),
    BASES.medio, ...largo('medio'),
    BASES.anular, ...largo('anular'),
    BASES.menique, ...largo('menique'),
  ];
  const indicePunta: Record<Dedo, number> = { pulgar: 4, indice: 8, medio: 12, anular: 16, menique: 20 };
  return { puntos, puntas: extendidos.map((d) => indicePunta[d]) };
}

/** Gira el esqueleto media vuelta (pulgar abajo = pulgar arriba invertido). */
function invertir(e: EsqueletoGesto): EsqueletoGesto {
  return { puntos: e.puntos.map(([x, y]) => [100 - x, 104 - y] as const), puntas: e.puntas };
}

const PULGAR_ARRIBA_GESTO = armar(PULGAR_ARRIBA, {}, ['pulgar']);

export const ESQUELETOS_GESTO: Record<CodigoGesto, EsqueletoGesto> = {
  Open_Palm: armar(PULGAR_ABIERTO, {}, ['pulgar', 'indice', 'medio', 'anular', 'menique']),
  Closed_Fist: armar(PULGAR_CRUZADO, {}, []),
  Pointing_Up: armar(PULGAR_CRUZADO, {}, ['indice']),
  Victory: armar(PULGAR_CRUZADO, EN_V, ['indice', 'medio']),
  Thumb_Up: PULGAR_ARRIBA_GESTO,
  Thumb_Down: invertir(PULGAR_ARRIBA_GESTO),
  ILoveYou: armar(PULGAR_ABIERTO, {}, ['pulgar', 'indice', 'menique']),
};
