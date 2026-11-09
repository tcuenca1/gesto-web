import { Accion } from '../../../dominio/accion/Accion';
import { resolverAccionEfectiva } from '../../../dominio/accion/Asignacion';
import { ErrorNoEncontrado, ErrorValidacion } from '../../../dominio/compartido/errores';
import { ReglasDeteccion } from '../../../dominio/deteccion/Deteccion';
import { SesionReconocimiento } from '../../../dominio/deteccion/SesionReconocimiento';
import { Gesto } from '../../../dominio/gesto/Gesto';
import { DtoAbrirSesion, DtoCerrarSesion, DtoDeteccion, DtoRegistrarDeteccion, DtoSesion } from '../../dto/DtoReconocimiento';
import { sesionARespuesta } from '../../dto/RespuestaReconocimiento';
import { PuertoEntradaReconocimientoEscritura } from '../../puerto/entrada/PuertoEntradaReconocimientoEscritura';
import { PuertoSalidaAccion } from '../../puerto/salida/PuertoSalidaAccion';
import { PuertoSalidaAsignacion } from '../../puerto/salida/PuertoSalidaAsignacion';
import { PuertoSalidaDeteccion } from '../../puerto/salida/PuertoSalidaDeteccion';
import { PuertoSalidaGesto } from '../../puerto/salida/PuertoSalidaGesto';
import { PuertoSalidaReloj } from '../../puerto/salida/PuertoSalidaReloj';
import { PuertoSalidaSesion } from '../../puerto/salida/PuertoSalidaSesion';
import { leerEnteroPositivo } from '../comun';

/** CU-03 · Sesiones de reconocimiento y registro de detecciones. */
export class CasoUso_ReconocimientoEscritura extends PuertoEntradaReconocimientoEscritura {
  constructor(
    private readonly sesiones: PuertoSalidaSesion,
    private readonly gestos: PuertoSalidaGesto,
    private readonly acciones: PuertoSalidaAccion,
    private readonly asignaciones: PuertoSalidaAsignacion,
    private readonly detecciones: PuertoSalidaDeteccion,
    private readonly reloj: PuertoSalidaReloj,
  ) {
    super();
  }

  /**
   * CU-03 paso 3 · Abre una sesión de reconocimiento al encender la cámara.
   * Si quedó una sesión abierta (pestaña cerrada sin apagar), se cierra primero.
   */
  async abrirSesion(dto: DtoAbrirSesion): Promise<DtoSesion> {
    const navegador = SesionReconocimiento.normalizarNavegador(dto.navegador);
    const sesion = await this.sesiones.abrir(dto.idUsuario, navegador);
    return sesionARespuesta(sesion);
  }

  /**
   * RF-14 / CU-03 paso 8 · Guarda un gesto aceptado dentro de una sesión.
   *
   * El navegador ya aplicó las reglas de aceptación, pero el servidor no confía
   * ciegamente: vuelve a comprobar que la sesión sea del usuario y esté abierta,
   * que el gesto exista y esté activo y que la confianza alcance el umbral.
   * La acción la decide el servidor según la configuración del usuario.
   */
  async registrarDeteccion(dto: DtoRegistrarDeteccion): Promise<DtoDeteccion> {
    const sesion = await this.sesiones.buscarPorId(leerEnteroPositivo(dto.idSesion, 'id'));
    if (!sesion) throw new ErrorNoEncontrado('La sesión de reconocimiento no existe');

    if (typeof dto.codigoGesto !== 'string' || dto.codigoGesto === '') {
      throw new ErrorValidacion('Falta el código del gesto');
    }
    const gesto = await this.gestos.buscarPorCodigo(dto.codigoGesto);
    if (!gesto) throw new ErrorValidacion(`El gesto "${dto.codigoGesto}" no existe`);

    const accion = await this.accionDelUsuario(dto.idUsuario, gesto);

    const nueva = ReglasDeteccion.crear({
      sesion,
      idUsuario: dto.idUsuario,
      gesto,
      idAccion: accion?.id ?? null,
      confianza: dto.confianza,
      mano: dto.mano,
      fechaHora: dto.fechaHora,
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

  /** CU-03 paso 9 · Cierra la sesión de reconocimiento al apagar la cámara. */
  async cerrarSesion(dto: DtoCerrarSesion): Promise<DtoSesion> {
    const sesion = await this.sesiones.buscarPorId(leerEnteroPositivo(dto.idSesion, 'id'));
    if (!sesion) throw new ErrorNoEncontrado('La sesión de reconocimiento no existe');
    sesion.asegurarDueno(dto.idUsuario);

    if (sesion.estaAbierta()) {
      sesion.cerrar(this.reloj.ahora());
      await this.sesiones.cerrar(sesion);
    }
    return sesionARespuesta(sesion);
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
