import { Asignacion } from '../../../dominio/accion/Asignacion';
import { PuertoSalidaAsignacion } from '../../../aplicacion/puerto/salida/PuertoSalidaAsignacion';
import { PuertoSalidaReloj } from '../../../aplicacion/puerto/salida/PuertoSalidaReloj';
import { AlmacenMemoria } from '../../base_dato/AlmacenMemoria';

/** Adaptador en memoria de PuertoSalidaAsignacion (pruebas y P-09). */
export class AdapSalida_AsignacionMemoria extends PuertoSalidaAsignacion {
  constructor(private readonly almacen: AlmacenMemoria, private readonly reloj: PuertoSalidaReloj) {
    super();
  }

  async listarDeUsuario(idUsuario: number): Promise<Asignacion[]> {
    return this.almacen.estado.asignaciones.filter((a) => a.idUsuario === idUsuario).map((a) => ({ ...a }));
  }

  async guardar(idUsuario: number, idGesto: number, idAccion: number): Promise<Asignacion> {
    const lista = this.almacen.estado.asignaciones;
    const nueva = { idUsuario, idGesto, idAccion, fechaActualizacion: this.reloj.ahora() };
    const i = lista.findIndex((a) => a.idUsuario === idUsuario && a.idGesto === idGesto);
    if (i >= 0) lista[i] = nueva;
    else lista.push(nueva);
    return { ...nueva };
  }

  async restaurar(idUsuario: number): Promise<void> {
    for (const g of this.almacen.estado.gestos) {
      await this.guardar(idUsuario, g.id, g.idAccionPredeterminada);
    }
  }
}
