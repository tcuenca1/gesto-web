import { RepositoriosTransaccionales, PuertoSalidaUnidadDeTrabajo } from '../../../aplicacion/puerto/salida/PuertoSalidaUnidadDeTrabajo';
import { AlmacenMemoria } from '../../base_dato/AlmacenMemoria';

/**
 * Transacción en memoria: guarda una copia del estado y, si algo falla,
 * la restaura. Mismo comportamiento "todo o nada" que BEGIN/ROLLBACK.
 */
export class AdapSalida_UnidadDeTrabajoMemoria extends PuertoSalidaUnidadDeTrabajo {
  constructor(private readonly almacen: AlmacenMemoria, private readonly repos: RepositoriosTransaccionales) {
    super();
  }

  async ejecutar<T>(trabajo: (repos: RepositoriosTransaccionales) => Promise<T>): Promise<T> {
    const copia = this.almacen.instantanea();
    try {
      return await trabajo(this.repos);
    } catch (error) {
      this.almacen.restaurar(copia);
      throw error;
    }
  }
}
