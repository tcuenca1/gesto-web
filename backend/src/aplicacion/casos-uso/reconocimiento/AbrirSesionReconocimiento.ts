import { SesionReconocimiento } from '../../../dominio/deteccion/SesionReconocimiento';
import { AbrirSesionReconocimientoPuerto, EntradaAbrirSesion } from '../../puertos/entrada/reconocimiento';
import { SesionDTO } from '../../puertos/entrada/dtos';
import { SesionRepositorio } from '../../puertos/salida/SesionRepositorio';
import { sesionADto } from '../comun';

/**
 * CU-03 paso 3 · Abre una sesión de reconocimiento al encender la cámara.
 * Si quedó una sesión abierta (pestaña cerrada sin apagar), se cierra primero.
 */
export class AbrirSesionReconocimiento implements AbrirSesionReconocimientoPuerto {
  constructor(private readonly sesiones: SesionRepositorio) {}

  async ejecutar(entrada: EntradaAbrirSesion): Promise<SesionDTO> {
    const navegador = SesionReconocimiento.normalizarNavegador(entrada.navegador);
    const sesion = await this.sesiones.abrir(entrada.idUsuario, navegador);
    return sesionADto(sesion);
  }
}
