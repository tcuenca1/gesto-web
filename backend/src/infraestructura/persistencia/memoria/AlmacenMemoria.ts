import { DatosAccion } from '../../../dominio/accion/Accion';
import { Asignacion } from '../../../dominio/accion/Asignacion';
import { Deteccion } from '../../../dominio/deteccion/Deteccion';
import { DatosSesion } from '../../../dominio/deteccion/SesionReconocimiento';
import { DatosGesto } from '../../../dominio/gesto/Gesto';
import { DatosUsuario } from '../../../dominio/usuario/Usuario';
import { NuevaEntradaBitacora } from '../../../aplicacion/puertos/salida/BitacoraRepositorio';

export interface FilaBitacoraMemoria extends NuevaEntradaBitacora {
  id: number;
  fechaHora: Date;
}

export interface EstadoMemoria {
  usuarios: DatosUsuario[];
  gestos: DatosGesto[];
  acciones: DatosAccion[];
  asignaciones: Asignacion[];
  sesiones: DatosSesion[];
  detecciones: Deteccion[];
  bitacora: FilaBitacoraMemoria[];
  secuencias: Record<string, number>;
}

/**
 * "Base de datos" en memoria: arreglos de JavaScript.
 *
 * Sirve para dos cosas:
 *  1. Correr las pruebas automáticas sin instalar PostgreSQL.
 *  2. Demostrar la prueba P-09: cambiar en main.ts los repositorios PostgreSQL
 *     por estos y comprobar que el núcleo sigue funcionando sin tocarlo.
 * Los datos se pierden al reiniciar el servidor.
 */
export class AlmacenMemoria {
  estado: EstadoMemoria;

  constructor(inicial: EstadoMemoria) {
    this.estado = structuredClone(inicial);
  }

  siguienteId(secuencia: string): number {
    const actual = this.estado.secuencias[secuencia] ?? 0;
    this.estado.secuencias[secuencia] = actual + 1;
    return actual + 1;
  }

  /** Copia completa del estado (para deshacer una transacción). */
  instantanea(): EstadoMemoria {
    return structuredClone(this.estado);
  }

  restaurar(copia: EstadoMemoria): void {
    this.estado = copia;
  }
}
