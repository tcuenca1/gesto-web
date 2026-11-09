/**
 * Tipos comunes de los DTO.
 *
 * DTO = "objeto de transferencia de datos": la forma en que los datos entran
 * a los casos de uso y salen de ellos. Son datos planos, sin métodos, para que
 * ningún adaptador pueda saltarse las reglas de las entidades.
 */

/** Los datos que llegan desde afuera se tratan como "desconocidos" hasta validarlos. */
export type SinValidar = unknown;

export interface Paginado<T> {
  elementos: T[];
  total: number;
  pagina: number;
  limite: number;
}
