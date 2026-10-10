import { ErrorValidacion, ErrorConflicto } from '../compartido/errores';
import { Gesto } from '../gesto/Gesto';
import { SesionReconocimiento } from './SesionReconocimiento';

export type Mano = 'Izquierda' | 'Derecha';
export const MANOS: readonly Mano[] = ['Izquierda', 'Derecha'];

/** Una detección lista para guardarse (todavía sin id). */
export interface NuevaDeteccion {
  idSesion: number;
  idGesto: number;
  idAccion: number | null;
  confianza: number;
  mano: Mano;
  fechaHora: Date;
}

export interface Deteccion extends NuevaDeteccion {
  id: number;
}

export interface DatosParaDetectar {
  sesion: SesionReconocimiento;
  idUsuario: number;
  gesto: Gesto;
  idAccion: number | null;
  confianza: unknown;
  mano: unknown;
  /** Hora que informa el navegador (puede venir de un reintento, flujo 8a). */
  fechaHora?: unknown;
  ahora: Date;
}

/** Reglas de una detección: confianza entre 0 y 1, mano válida, gesto activo. */
export const ReglasDeteccion = {
  validarConfianza(confianza: unknown): number {
    const valor = typeof confianza === 'string' ? Number(confianza) : confianza;
    if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < 0 || valor > 1) {
      throw new ErrorValidacion('La confianza debe ser un número entre 0 y 1');
    }
    return Math.round(valor * 1000) / 1000; // NUMERIC(4,3)
  },

  validarMano(mano: unknown): Mano {
    if (!MANOS.includes(mano as Mano)) throw new ErrorValidacion('La mano debe ser Izquierda o Derecha');
    return mano as Mano;
  },

  /**
   * La hora del navegador se respeta (sirve para reintentos), pero nunca puede
   * quedar antes del inicio de la sesión ni en el futuro: los relojes de los
   * computadores no siempre están bien igualados.
   */
  ajustarFecha(fechaHora: unknown, sesion: SesionReconocimiento, ahora: Date): Date {
    if (fechaHora === undefined || fechaHora === null) return ahora;
    const fecha = new Date(fechaHora as string);
    if (Number.isNaN(fecha.getTime())) throw new ErrorValidacion('La fecha de la detección no es válida');
    if (fecha > ahora) return ahora;
    if (fecha < sesion.fechaInicio) return sesion.fechaInicio;
    return fecha;
  },

  /** Arma una detección aplicando todas las reglas del negocio. */
  crear(d: DatosParaDetectar): NuevaDeteccion {
    d.sesion.asegurarQueRecibeDetecciones(d.idUsuario);
    if (!d.gesto.activo) throw new ErrorConflicto(`El gesto ${d.gesto.nombre} está desactivado`);
    const confianza = ReglasDeteccion.validarConfianza(d.confianza);
    if (!d.gesto.aceptaConfianza(confianza)) {
      throw new ErrorValidacion(
        `La confianza ${confianza} no alcanza el mínimo de ${d.gesto.umbralConfianza} para ${d.gesto.nombre}`,
      );
    }
    return {
      idSesion: d.sesion.id,
      idGesto: d.gesto.id,
      idAccion: d.idAccion,
      confianza,
      mano: ReglasDeteccion.validarMano(d.mano),
      fechaHora: ReglasDeteccion.ajustarFecha(d.fechaHora, d.sesion, d.ahora),
    };
  },
};
