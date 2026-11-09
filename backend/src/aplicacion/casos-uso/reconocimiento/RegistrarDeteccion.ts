import { Accion } from '../../../dominio/accion/Accion';
import { resolverAccionEfectiva } from '../../../dominio/accion/Asignacion';
import { ErrorNoEncontrado, ErrorValidacion } from '../../../dominio/compartido/errores';
import { ReglasDeteccion } from '../../../dominio/deteccion/Deteccion';
import { Gesto } from '../../../dominio/gesto/Gesto';
import { DeteccionDTO } from '../../puertos/entrada/dtos';
import { EntradaRegistrarDeteccion, RegistrarDeteccionPuerto } from '../../puertos/entrada/reconocimiento';
import { PuertoSalidaAccion } from '../../puerto/salida/PuertoSalidaAccion';
import { PuertoSalidaAsignacion } from '../../puerto/salida/PuertoSalidaAsignacion';
import { PuertoSalidaDeteccion } from '../../puerto/salida/PuertoSalidaDeteccion';
import { PuertoSalidaGesto } from '../../puerto/salida/PuertoSalidaGesto';
import { PuertoSalidaSesion } from '../../puerto/salida/PuertoSalidaSesion';
import { PuertoSalidaReloj } from '../../puerto/salida/PuertoSalidaReloj';

/**
 * RF-14 / CU-03 paso 8 · Guarda un gesto aceptado dentro de una sesión.
 *
 * El navegador ya aplicó las reglas de aceptación, pero el servidor no confía
 * ciegamente: vuelve a comprobar que la sesión sea del usuario y esté abierta,
 * que el gesto exista y esté activo y que la confianza alcance el umbral.
 * La acción la decide el servidor según la configuración del usuario.
 */
export class RegistrarDeteccion implements RegistrarDeteccionPuerto {
  constructor(
    private readonly sesiones: PuertoSalidaSesion,
    private readonly gestos: PuertoSalidaGesto,
    private readonly acciones: PuertoSalidaAccion,
    private readonly asignaciones: PuertoSalidaAsignacion,
    private readonly detecciones: PuertoSalidaDeteccion,
    private readonly reloj: PuertoSalidaReloj,
  ) {}

  async ejecutar(entrada: EntradaRegistrarDeteccion): Promise<DeteccionDTO> {
    const sesion = await this.sesiones.buscarPorId(entrada.idSesion);
    if (!sesion) throw new ErrorNoEncontrado('La sesión de reconocimiento no existe');

    if (typeof entrada.codigoGesto !== 'string' || entrada.codigoGesto === '') {
      throw new ErrorValidacion('Falta el código del gesto');
    }
    const gesto = await this.gestos.buscarPorCodigo(entrada.codigoGesto);
    if (!gesto) throw new ErrorValidacion(`El gesto "${entrada.codigoGesto}" no existe`);

    const accion = await this.accionDelUsuario(entrada.idUsuario, gesto);

    const nueva = ReglasDeteccion.crear({
      sesion,
      idUsuario: entrada.idUsuario,
      gesto,
      idAccion: accion?.id ?? null,
      confianza: entrada.confianza,
      mano: entrada.mano,
      fechaHora: entrada.fechaHora,
      ahora: this.reloj.ahora(),
    });
    const guardada = await this.detecciones.guardar(nueva);

    return {
      id: guardada.id,
      idSesion: guardada.idSesion,
      codigoGesto: gesto.codigo,
      nombreGesto: gesto.nombre,
      codigoAccion: accion?.codigo ?? null,
      nombreAccion: accion?.nombre ?? null,
      confianza: guardada.confianza,
      mano: guardada.mano,
      fechaHora: guardada.fechaHora,
    };
  }

  /** Acción efectiva del gesto para este usuario (regla resolverAccionEfectiva). */
  private async accionDelUsuario(idUsuario: number, gesto: Gesto): Promise<Accion | null> {
    const asignacion = (await this.asignaciones.listarDeUsuario(idUsuario)).find((a) => a.idGesto === gesto.id);
    const ids = new Set([gesto.idAccionPredeterminada, ...(asignacion ? [asignacion.idAccion] : [])]);
    const acciones = new Map<number, Accion>();
    for (const id of ids) {
      const accion = await this.acciones.buscarPorId(id);
      if (accion) acciones.set(id, accion);
    }
    return resolverAccionEfectiva(gesto, asignacion, acciones).accion;
  }
}
