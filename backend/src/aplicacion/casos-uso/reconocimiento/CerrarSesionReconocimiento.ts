import { ErrorNoEncontrado } from '../../../dominio/compartido/errores';
import { SesionDTO } from '../../puertos/entrada/dtos';
import { CerrarSesionReconocimientoPuerto, EntradaCerrarSesion } from '../../puertos/entrada/reconocimiento';
import { PuertoSalidaSesion } from '../../puerto/salida/PuertoSalidaSesion';
import { PuertoSalidaReloj } from '../../puerto/salida/PuertoSalidaReloj';
import { sesionADto } from '../comun';

/** CU-03 paso 9 · Cierra la sesión de reconocimiento al apagar la cámara. */
export class CerrarSesionReconocimiento implements CerrarSesionReconocimientoPuerto {
  constructor(
    private readonly sesiones: PuertoSalidaSesion,
    private readonly reloj: PuertoSalidaReloj,
  ) {}

  async ejecutar(entrada: EntradaCerrarSesion): Promise<SesionDTO> {
    const sesion = await this.sesiones.buscarPorId(entrada.idSesion);
    if (!sesion) throw new ErrorNoEncontrado('La sesión de reconocimiento no existe');
    sesion.asegurarDueno(entrada.idUsuario);

    if (sesion.estaAbierta()) {
      sesion.cerrar(this.reloj.ahora());
      await this.sesiones.cerrar(sesion);
    }
    return sesionADto(sesion);
  }
}
