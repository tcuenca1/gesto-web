/**
 * Puerto de salida del modo simulado (?simulado=1): permite "hacer" un gesto
 * con un botón o una tecla. Con la cámara real no hace nada. Así la pantalla
 * Reconocer no necesita conocer el adaptador simulado.
 */
export abstract class PuertoSalidaSimuladorGestos {
  /** Gesto que la persona "está haciendo" (null = no hay mano). */
  abstract simular(codigo: string | null): void;
}
