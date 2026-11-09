import { SesionReconocimiento } from '../../../dominio/deteccion/SesionReconocimiento';

/** Puerto de salida: abrir y cerrar sesiones de reconocimiento. */
export abstract class PuertoSalidaSesion {
  /**
   * Cierra cualquier sesión abierta del usuario y abre una nueva
   * (flujo alternativo 9a de CU-03).
   */
  abstract abrir(idUsuario: number, navegador: string | null): Promise<SesionReconocimiento>;
  abstract buscarPorId(id: number): Promise<SesionReconocimiento | null>;
  abstract cerrar(sesion: SesionReconocimiento): Promise<void>;
  abstract contar(): Promise<number>;
}
