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
