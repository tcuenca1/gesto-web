import { ErrorNoEncontrado } from '../../../dominio/compartido/errores';
import { DtoSesion } from '../../dto/DtoReconocimiento';
import { CerrarSesionReconocimientoPuerto } from '../../puertos/entrada/reconocimiento';
import { DtoCerrarSesion } from '../../dto/DtoReconocimiento';
import { PuertoSalidaSesion } from '../../puerto/salida/PuertoSalidaSesion';
import { PuertoSalidaReloj } from '../../puerto/salida/PuertoSalidaReloj';
import { sesionARespuesta } from '../../dto/RespuestaReconocimiento';

/** CU-03 paso 9 · Cierra la sesión de reconocimiento al apagar la cámara. */
export class CerrarSesionReconocimiento implements CerrarSesionReconocimientoPuerto {
  constructor(
    private readonly sesiones: PuertoSalidaSesion,
    private readonly reloj: PuertoSalidaReloj,
  ) {}

  async ejecutar(entrada: DtoCerrarSesion): Promise<DtoSesion> {
    const sesion = await this.sesiones.buscarPorId(entrada.idSesion);
    if (!sesion) throw new ErrorNoEncontrado('La sesión de reconocimiento no existe');
    sesion.asegurarDueno(entrada.idUsuario);

    if (sesion.estaAbierta()) {
      sesion.cerrar(this.reloj.ahora());
      await this.sesiones.cerrar(sesion);
    }
    return sesionARespuesta(sesion);
  }
}
