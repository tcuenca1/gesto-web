import { Accion, NuevaAccion } from '../../../dominio/accion/Accion';
import { ErrorConflicto } from '../../../dominio/compartido/errores';
import { PuertoSalidaAccion } from '../../../aplicacion/puerto/salida/PuertoSalidaAccion';
import { AlmacenMemoria } from '../../base_dato/AlmacenMemoria';

/** Adaptador en memoria de PuertoSalidaAccion (pruebas y P-09). */
export class AdapSalida_AccionMemoria extends PuertoSalidaAccion {
  constructor(private readonly almacen: AlmacenMemoria) {
    super();
  }

  async listar(opciones: { soloActivas?: boolean } = {}): Promise<Accion[]> {
    return this.almacen.estado.acciones
      .filter((a) => !opciones.soloActivas || a.activa)
      .sort((a, b) => a.id - b.id)
      .map(Accion.reconstruir);
  }

  async buscarPorId(id: number): Promise<Accion | null> {
    const datos = this.almacen.estado.acciones.find((a) => a.id === id);
    return datos ? Accion.reconstruir(datos) : null;
  }

  async buscarPorCodigo(codigo: string): Promise<Accion | null> {
    const datos = this.almacen.estado.acciones.find((a) => a.codigo === codigo);
    return datos ? Accion.reconstruir(datos) : null;
  }

  async crear(nueva: NuevaAccion): Promise<Accion> {
    if (this.almacen.estado.acciones.some((a) => a.codigo === nueva.codigo)) {
      throw new ErrorConflicto(`Ya existe una acción con el código ${nueva.codigo}`);
    }
    const datos = { ...nueva, id: this.almacen.siguienteId('acciones'), activa: true };
    this.almacen.estado.acciones.push(datos);
    return Accion.reconstruir(datos);
  }

  async actualizar(accion: Accion): Promise<void> {
    const lista = this.almacen.estado.acciones;
    const i = lista.findIndex((a) => a.id === accion.id);
    if (i >= 0) lista[i] = accion.aDatos();
  }

  async esPredeterminadaDeAlgunGesto(idAccion: number): Promise<boolean> {
    return this.almacen.estado.gestos.some((g) => g.idAccionPredeterminada === idAccion);
  }
}
