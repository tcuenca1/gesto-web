import { Gesto } from '../../../dominio/gesto/Gesto';

/** Puerto de salida: leer y editar el catálogo de gestos. */
export abstract class PuertoSalidaGesto {
  abstract listar(opciones?: { soloActivos?: boolean }): Promise<Gesto[]>;
  abstract buscarPorId(id: number): Promise<Gesto | null>;
  abstract buscarPorCodigo(codigo: string): Promise<Gesto | null>;
  abstract actualizar(gesto: Gesto): Promise<void>;
}
