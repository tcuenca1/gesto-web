import { ResultadoReconocimiento } from '../dominio/gesto';
import { ReglasAceptacion } from './reglas-aceptacion';

/**
 * Pruebas de las reglas de aceptación (RF-09) con datos falsos:
 * no se necesita cámara ni modelo, solo resultados y una hora inventada.
 */
describe('ReglasAceptacion', () => {
  const umbrales = new Map([
    ['Thumb_Up', 0.7],
    ['Victory', 0.7],
    ['Pointing_Up', 0.85],
  ]);
  const gesto = (codigo: string, confianza = 0.9): ResultadoReconocimiento => ({ codigo, confianza, mano: 'Derecha', puntos: [] });

  /** Simula imágenes cada 33 ms (≈30 por segundo) con el mismo resultado. */
  function mantener(reglas: ReglasAceptacion, r: ResultadoReconocimiento | null, desde: number, hasta: number) {
    const estados = [];
    for (let t = desde; t <= hasta; t += 33) estados.push({ t, ...reglas.evaluar(r, t) });
    return estados;
  }

  it('no acepta un gesto antes de medio segundo de estabilidad', () => {
    const reglas = new ReglasAceptacion(umbrales);
    const estados = mantener(reglas, gesto('Thumb_Up'), 0, 480);
    expect(estados.every((e) => e.tipo === 'estabilizando')).toBeTrue();
  });

  it('acepta el gesto una sola vez al cumplir 500 ms', () => {
    const reglas = new ReglasAceptacion(umbrales);
    const estados = mantener(reglas, gesto('Thumb_Up'), 0, 900);
    const aceptados = estados.filter((e) => e.tipo === 'aceptado');
    expect(aceptados.length).toBe(1);
    expect(aceptados[0].t).toBeGreaterThanOrEqual(500);
  });

  it('respeta la pausa de 1 segundo antes de repetir el mismo gesto', () => {
    const reglas = new ReglasAceptacion(umbrales);
    const estados = mantener(reglas, gesto('Thumb_Up'), 0, 2700);
    const tiempos = estados.filter((e) => e.tipo === 'aceptado').map((e) => e.t);
    expect(tiempos.length).toBe(3); // ≈0.5 s, ≈1.5 s y ≈2.5 s
    for (let i = 1; i < tiempos.length; i++) expect(tiempos[i] - tiempos[i - 1]).toBeGreaterThanOrEqual(1000);
    expect(estados.some((e) => e.tipo === 'en-pausa')).toBeTrue();
  });

  it('ignora gestos con confianza menor al umbral de ese gesto', () => {
    const reglas = new ReglasAceptacion(umbrales);
    const estados = mantener(reglas, gesto('Pointing_Up', 0.8), 0, 1500); // su umbral es 0.85
    expect(estados.every((e) => e.tipo === 'buscando')).toBeTrue();
  });

  it('ignora "None" y los gestos desactivados (que no están en los umbrales)', () => {
    const reglas = new ReglasAceptacion(umbrales);
    expect(mantener(reglas, gesto('None', 0.95), 0, 1000).every((e) => e.tipo === 'buscando')).toBeTrue();
    expect(mantener(reglas, gesto('ILoveYou', 0.99), 0, 1000).every((e) => e.tipo === 'buscando')).toBeTrue();
  });

  it('sin mano no hay gesto', () => {
    expect(new ReglasAceptacion(umbrales).evaluar(null, 0).tipo).toBe('sin-mano');
  });

  it('un cambio de gesto reinicia la cuenta de estabilidad (evita movimientos de paso)', () => {
    const reglas = new ReglasAceptacion(umbrales);
    mantener(reglas, gesto('Pointing_Up', 0.95), 0, 400);
    const estados = mantener(reglas, gesto('Victory'), 433, 900);
    expect(estados.some((e) => e.tipo === 'aceptado')).toBeFalse();
    expect(mantener(reglas, gesto('Victory'), 933, 1000).some((e) => e.tipo === 'aceptado')).toBeTrue();
  });

  it('tolera un parpadeo corto del modelo sin reiniciar la cuenta', () => {
    const reglas = new ReglasAceptacion(umbrales);
    mantener(reglas, gesto('Thumb_Up'), 0, 300);
    reglas.evaluar(gesto('None', 0.5), 333); // una imagen borrosa
    const estados = mantener(reglas, gesto('Thumb_Up'), 366, 560);
    expect(estados.some((e) => e.tipo === 'aceptado')).toBeTrue();
  });

  it('el progreso de estabilidad va de 0 a 1', () => {
    const reglas = new ReglasAceptacion(umbrales);
    reglas.evaluar(gesto('Victory'), 0);
    const e = reglas.evaluar(gesto('Victory'), 250);
    expect(e.tipo === 'estabilizando' && e.progreso).toBeCloseTo(0.5, 2);
  });
});
