import { Gesto } from '../../../dominio/gesto/Gesto';

/** Puerto de salida: leer y editar el catálogo de gestos. */
export interface GestoRepositorio {
  listar(opciones?: { soloActivos?: boolean }): Promise<Gesto[]>;
  buscarPorId(id: number): Promise<Gesto | null>;
  buscarPorCodigo(codigo: string): Promise<Gesto | null>;
  actualizar(gesto: Gesto): Promise<void>;
}
