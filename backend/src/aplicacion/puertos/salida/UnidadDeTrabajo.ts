import { AccionRepositorio } from './AccionRepositorio';
import { BitacoraRepositorio } from './BitacoraRepositorio';
import { GestoRepositorio } from './GestoRepositorio';
import { UsuarioRepositorio } from './UsuarioRepositorio';

/** Repositorios que trabajan dentro de una misma transacción. */
export interface RepositoriosTransaccionales {
  usuarios: UsuarioRepositorio;
  gestos: GestoRepositorio;
  acciones: AccionRepositorio;
  bitacora: BitacoraRepositorio;
}

/**
 * Puerto de salida: ejecutar varios cambios como uno solo (todo o nada).
 *
 * La SRS (§9.3) pide que la bitácora se escriba "en la misma transacción que
 * el cambio". El núcleo expresa esa necesidad con este puerto, sin saber que
 * por debajo hay BEGIN/COMMIT de PostgreSQL.
 */
export interface UnidadDeTrabajo {
  ejecutar<T>(trabajo: (repos: RepositoriosTransaccionales) => Promise<T>): Promise<T>;
}
