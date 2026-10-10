/**
 * Ejecutor de acciones (RF-11).
 *
 * Principio abierto/cerrado (la "O" de SOLID): para agregar una acción nueva
 * no se modifica esta clase; quien sabe hacer la acción (por ejemplo, el
 * panel de demostración) registra un manejador con su código.
 *
 *    ejecutor.registrar('SIGUIENTE', () => panel.siguiente());
 */
export type ManejadorAccion = () => void;
export type ResultadoEjecucion = 'ejecutada' | 'ninguna' | 'sin-manejador';

export class EjecutorAcciones {
  private readonly manejadores = new Map<string, ManejadorAccion>();

  /** Registra un manejador. Devuelve una función para quitarlo. */
  registrar(codigoAccion: string, manejador: ManejadorAccion): () => void {
    this.manejadores.set(codigoAccion, manejador);
    return () => {
      if (this.manejadores.get(codigoAccion) === manejador) this.manejadores.delete(codigoAccion);
    };
  }

  /** Registra varios a la vez. Devuelve una función que los quita todos. */
  registrarVarios(manejadores: Record<string, ManejadorAccion>): () => void {
    const quitar = Object.entries(manejadores).map(([codigo, fn]) => this.registrar(codigo, fn));
    return () => quitar.forEach((q) => q());
  }

  ejecutar(codigoAccion: string | null | undefined): ResultadoEjecucion {
    if (!codigoAccion || codigoAccion === 'NINGUNA') return 'ninguna';
    const manejador = this.manejadores.get(codigoAccion);
    if (!manejador) return 'sin-manejador';
    manejador();
    return 'ejecutada';
  }
}
