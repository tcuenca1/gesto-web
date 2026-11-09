import { SesionReconocimiento } from '../../../dominio/deteccion/SesionReconocimiento';
import { PuertoSalidaSesion } from '../../../aplicacion/puerto/salida/PuertoSalidaSesion';
import { PuertoSalidaReloj } from '../../../aplicacion/puerto/salida/PuertoSalidaReloj';
import { AlmacenMemoria } from '../../base_dato/AlmacenMemoria';

/** Adaptador en memoria de PuertoSalidaSesion (pruebas y P-09). */
export class AdapSalida_SesionMemoria extends PuertoSalidaSesion {
  constructor(private readonly almacen: AlmacenMemoria, private readonly reloj: PuertoSalidaReloj) {
    super();
  }

  async abrir(idUsuario: number, navegador: string | null): Promise<SesionReconocimiento> {
    const e = this.almacen.estado;
    // Imita sp_abrir_sesion: cierra las abiertas con la hora de su última detección.
    for (const s of e.sesiones.filter((s) => s.idUsuario === idUsuario && s.fechaFin === null)) {
      const ultimas = e.detecciones.filter((d) => d.idSesion === s.id).map((d) => d.fechaHora.getTime());
      s.fechaFin = new Date(Math.max(s.fechaInicio.getTime(), ...ultimas));
    }
    const datos = {
      id: this.almacen.siguienteId('sesiones'),
      idUsuario,
      fechaInicio: this.reloj.ahora(),
      fechaFin: null,
      navegador,
      totalDetecciones: 0,
    };
    e.sesiones.push(datos);
    return SesionReconocimiento.reconstruir(datos);
  }

  async buscarPorId(id: number): Promise<SesionReconocimiento | null> {
    const datos = this.almacen.estado.sesiones.find((s) => s.id === id);
    return datos ? SesionReconocimiento.reconstruir(datos) : null;
  }

  async cerrar(sesion: SesionReconocimiento): Promise<void> {
    const datos = this.almacen.estado.sesiones.find((s) => s.id === sesion.id);
    if (datos) datos.fechaFin = sesion.fechaFin;
  }

  async contar(): Promise<number> {
    return this.almacen.estado.sesiones.length;
  }
}
