import { Gesto } from '../../../dominio/gesto/Gesto';
import { PuertoSalidaGesto } from '../../../aplicacion/puerto/salida/PuertoSalidaGesto';
import { AlmacenMemoria } from '../../base_dato/AlmacenMemoria';

/** Adaptador en memoria de PuertoSalidaGesto (pruebas y P-09). */
export class AdapSalida_GestoMemoria extends PuertoSalidaGesto {
  constructor(private readonly almacen: AlmacenMemoria) {
    super();
  }

  async listar(opciones: { soloActivos?: boolean } = {}): Promise<Gesto[]> {
    return this.almacen.estado.gestos
      .filter((g) => !opciones.soloActivos || g.activo)
      .sort((a, b) => a.id - b.id)
      .map(Gesto.reconstruir);
  }

  async buscarPorId(id: number): Promise<Gesto | null> {
    const datos = this.almacen.estado.gestos.find((g) => g.id === id);
    return datos ? Gesto.reconstruir(datos) : null;
  }

  async buscarPorCodigo(codigo: string): Promise<Gesto | null> {
    const datos = this.almacen.estado.gestos.find((g) => g.codigo === codigo);
    return datos ? Gesto.reconstruir(datos) : null;
  }

  async actualizar(gesto: Gesto): Promise<void> {
    const lista = this.almacen.estado.gestos;
    const i = lista.findIndex((g) => g.id === gesto.id);
    if (i >= 0) lista[i] = gesto.aDatos();
  }
}
