import { SesionReconocimiento } from '../../../dominio/deteccion/SesionReconocimiento';
import { AbrirSesionReconocimientoPuerto } from '../../puertos/entrada/reconocimiento';
import { DtoAbrirSesion } from '../../dto/DtoReconocimiento';
import { DtoSesion } from '../../dto/DtoReconocimiento';
import { PuertoSalidaSesion } from '../../puerto/salida/PuertoSalidaSesion';
import { sesionARespuesta } from '../../dto/RespuestaReconocimiento';

/**
 * CU-03 paso 3 · Abre una sesión de reconocimiento al encender la cámara.
 * Si quedó una sesión abierta (pestaña cerrada sin apagar), se cierra primero.
 */
export class AbrirSesionReconocimiento implements AbrirSesionReconocimientoPuerto {
  constructor(private readonly sesiones: PuertoSalidaSesion) {}

  async ejecutar(entrada: DtoAbrirSesion): Promise<DtoSesion> {
    const navegador = SesionReconocimiento.normalizarNavegador(entrada.navegador);
    const sesion = await this.sesiones.abrir(entrada.idUsuario, navegador);
    return sesionARespuesta(sesion);
  }
}
