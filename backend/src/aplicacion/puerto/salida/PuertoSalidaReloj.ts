/**
 * Puerto de salida: la hora actual. Permite probar reglas que dependen
 * del tiempo con un reloj falso.
 */
export abstract class PuertoSalidaReloj {
  abstract ahora(): Date;
}
