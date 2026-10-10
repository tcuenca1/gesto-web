import { SesionReconocimiento } from '../../../dominio/deteccion/SesionReconocimiento';

/** Puerto de salida: abrir y cerrar sesiones de reconocimiento. */
export interface SesionRepositorio {
  /**
   * Cierra cualquier sesión abierta del usuario y abre una nueva
   * (flujo alternativo 9a de CU-03).
   */
  abrir(idUsuario: number, navegador: string | null): Promise<SesionReconocimiento>;
  buscarPorId(id: number): Promise<SesionReconocimiento | null>;
  cerrar(sesion: SesionReconocimiento): Promise<void>;
  contar(): Promise<number>;
}
