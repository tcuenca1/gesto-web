import { PuertoSalidaBitacora, EntradaBitacora, NuevaEntradaBitacora } from '../../../aplicacion/puerto/salida/PuertoSalidaBitacora';
import { PuertoSalidaReloj } from '../../../aplicacion/puerto/salida/PuertoSalidaReloj';
import { AlmacenMemoria } from '../../base_dato/AlmacenMemoria';

/** Adaptador en memoria de PuertoSalidaBitacora (pruebas y P-09). */
export class AdapSalida_BitacoraMemoria extends PuertoSalidaBitacora {
  constructor(private readonly almacen: AlmacenMemoria, private readonly reloj: PuertoSalidaReloj) {
    super();
  }

  async registrar(entrada: NuevaEntradaBitacora): Promise<void> {
    this.almacen.estado.bitacora.push({
      ...structuredClone(entrada),
      id: this.almacen.siguienteId('bitacora'),
      fechaHora: this.reloj.ahora(),
    });
  }

  async listar(pagina: number, limite: number): Promise<{ elementos: EntradaBitacora[]; total: number }> {
    const e = this.almacen.estado;
    const ordenadas = [...e.bitacora].sort((a, b) => b.id - a.id);
    const inicio = (pagina - 1) * limite;
    return {
      total: ordenadas.length,
      elementos: ordenadas.slice(inicio, inicio + limite).map((f) => ({
        ...f,
        nombreUsuario: e.usuarios.find((u) => u.id === f.idUsuario)?.nombre ?? '',
      })),
    };
  }
}
