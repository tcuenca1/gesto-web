/**
 * Contrato común de todos los casos de uso (puertos de entrada).
 *
 * Cada caso de uso hace UNA sola cosa y se ejecuta con `ejecutar`.
 * El adaptador web (controladores Express) depende de estos contratos,
 * no de las clases concretas: así se pueden reemplazar en las pruebas.
 */
export interface CasoDeUso<Entrada, Salida> {
  ejecutar(entrada: Entrada): Promise<Salida>;
}

/** Los datos que llegan desde afuera se tratan como "desconocidos" hasta validarlos. */
export type SinValidar = unknown;

export interface Paginado<T> {
  elementos: T[];
  total: number;
  pagina: number;
  limite: number;
}
