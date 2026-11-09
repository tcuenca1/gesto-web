import { PuertoSalidaAccion } from './PuertoSalidaAccion';
import { PuertoSalidaBitacora } from './PuertoSalidaBitacora';
import { PuertoSalidaGesto } from './PuertoSalidaGesto';
import { PuertoSalidaUsuario } from './PuertoSalidaUsuario';

/** Puertos que trabajan dentro de una misma transacción. */
export interface RepositoriosTransaccionales {
  usuarios: PuertoSalidaUsuario;
  gestos: PuertoSalidaGesto;
  acciones: PuertoSalidaAccion;
  bitacora: PuertoSalidaBitacora;
}

/**
 * Puerto de salida: ejecutar varios cambios como uno solo (todo o nada).
 *
 * La SRS (§9.3) pide que la bitácora se escriba "en la misma transacción que
 * el cambio". El núcleo expresa esa necesidad con este puerto, sin saber que
 * por debajo hay BEGIN/COMMIT de PostgreSQL.
 */
export abstract class PuertoSalidaUnidadDeTrabajo {
  abstract ejecutar<T>(trabajo: (repos: RepositoriosTransaccionales) => Promise<T>): Promise<T>;
}
