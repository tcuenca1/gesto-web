import { ErrorApi, NuevaDeteccion } from '../dominio/modelos';

/**
 * Cola de envío de detecciones (CU-03, flujo alternativo 8a).
 *
 * Si el servidor no responde, el reconocimiento sigue funcionando y las
 * detecciones esperan aquí hasta que se puedan enviar. Cada detección guarda
 * la hora en que ocurrió, así el historial queda correcto aunque llegue tarde.
 */
export interface OpcionesCola {
  reintentoMs: number;
  /** Para no llenar la memoria si el servidor está caído mucho tiempo. */
  maximoPendientes: number;
}

export interface Temporizador {
  programar(fn: () => void, ms: number): unknown;
  cancelar(id: unknown): void;
}

const temporizadorNavegador: Temporizador = {
  programar: (fn, ms) => setTimeout(fn, ms),
  cancelar: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
};

export class ColaDetecciones {
  private readonly pendientes: NuevaDeteccion[] = [];
  private proceso: Promise<void> | null = null;
  private reintento: unknown = null;
  private descartadas = 0;

  constructor(
    private readonly enviar: (d: NuevaDeteccion) => Promise<void>,
    private readonly alCambiar: (pendientes: number) => void = () => undefined,
    private readonly opciones: OpcionesCola = { reintentoMs: 3000, maximoPendientes: 500 },
    private readonly temporizador: Temporizador = temporizadorNavegador,
  ) {}

  get cantidadPendientes(): number {
    return this.pendientes.length;
  }

  get cantidadDescartadas(): number {
    return this.descartadas;
  }

  agregar(deteccion: NuevaDeteccion): void {
    if (this.pendientes.length >= this.opciones.maximoPendientes) {
      this.pendientes.shift();
      this.descartadas++;
    }
    this.pendientes.push(deteccion);
    this.alCambiar(this.pendientes.length);
    void this.procesar();
  }

  /** Intenta enviar todo lo pendiente (por ejemplo, antes de cerrar la sesión). */
  async vaciar(): Promise<boolean> {
    this.cancelarReintento();
    await this.procesar();
    return this.pendientes.length === 0;
  }

  detener(): void {
    this.cancelarReintento();
    this.pendientes.length = 0;
    this.alCambiar(0);
  }

  /** Si ya hay un envío en curso, devuelve ese mismo (nunca dos a la vez). */
  private procesar(): Promise<void> {
    this.proceso ??= this.enviarPendientes().finally(() => (this.proceso = null));
    return this.proceso;
  }

  private async enviarPendientes(): Promise<void> {
    while (this.pendientes.length > 0) {
      try {
        await this.enviar(this.pendientes[0]);
        this.pendientes.shift();
      } catch (error) {
        if (error instanceof ErrorApi && !error.reintentable) {
          // Error permanente (por ejemplo, el gesto fue desactivado): se descarta.
          this.pendientes.shift();
          this.descartadas++;
        } else {
          this.programarReintento();
          return;
        }
      } finally {
        this.alCambiar(this.pendientes.length);
      }
    }
  }

  private programarReintento(): void {
    if (this.reintento !== null) return;
    this.reintento = this.temporizador.programar(() => {
      this.reintento = null;
      void this.procesar();
    }, this.opciones.reintentoMs);
  }

  private cancelarReintento(): void {
    if (this.reintento !== null) this.temporizador.cancelar(this.reintento);
    this.reintento = null;
  }
}
