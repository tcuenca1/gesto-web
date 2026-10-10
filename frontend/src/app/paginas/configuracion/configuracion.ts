import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Avisos } from '../../compartido/servicios/avisos';
import { infoGesto } from '../../nucleo/dominio/gesto';
import { Accion, Asignacion } from '../../nucleo/dominio/modelos';
import { ApiConfiguracion, ApiGestoWeb } from '../../nucleo/puertos/api-gestoweb';

/** RF-12 · El usuario elige qué acción hace cada gesto, o vuelve a la configuración inicial. */
@Component({
  selector: 'app-configuracion',
  imports: [RouterLink],
  template: `
    <section class="pagina">
      <div class="pagina__titulo">
        <div>
          <h1>Mis gestos</h1>
          <p>Elige qué pasa en el panel de demostración cuando haces cada gesto. Los cambios se guardan al instante.</p>
        </div>
        <button type="button" class="boton boton--fantasma" (click)="restaurar()" [disabled]="cargando()">Volver a la configuración inicial</button>
      </div>

      @if (error()) {
        <p class="alerta alerta--error" role="alert">{{ error() }}</p>
      }

      @if (cargando()) {
        <p class="texto-suave">Cargando tu configuración…</p>
      } @else {
        <div class="panel tabla-contenedor">
          <table>
            <thead>
              <tr><th>Gesto</th><th>Acción</th><th><span class="oculto-visual">Estado</span></th></tr>
            </thead>
            <tbody>
              @for (a of asignaciones(); track a.gesto.id) {
                <tr>
                  <td>
                    <span class="icono" aria-hidden="true">{{ icono(a.gesto.codigo) }}</span>
                    <strong>{{ a.gesto.nombre }}</strong>
                  </td>
                  <td>
                    <label class="oculto-visual" [for]="'accion-' + a.gesto.id">Acción para {{ a.gesto.nombre }}</label>
                    <select [id]="'accion-' + a.gesto.id" [value]="a.accion?.id ?? ''" (change)="cambiar(a, $any($event.target).value)" [disabled]="guardando() === a.gesto.id">
                      @for (ac of acciones(); track ac.id) {
                        <option [value]="ac.id" [selected]="ac.id === a.accion?.id">{{ ac.nombre }}</option>
                      }
                    </select>
                  </td>
                  <td>
                    @if (guardando() === a.gesto.id) {
                      <span class="texto-suave">Guardando…</span>
                    } @else if (a.esPredeterminada) {
                      <span class="etiqueta etiqueta--apagada">Inicial</span>
                    } @else {
                      <span class="etiqueta">Personalizada</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <p class="texto-suave">Pruébalo en <a routerLink="/reconocer">Reconocer</a>. Si un gesto no aparece, el administrador lo desactivó.</p>
      }
    </section>
  `,
  styles: `
    td:first-child { white-space: nowrap; }
    .icono { font-size: 1.5rem; margin-right: 0.5rem; vertical-align: middle; }
    select { max-width: 22rem; }
    td:last-child { width: 9rem; }
  `,
})
export class Configuracion implements OnInit {
  private readonly api: ApiConfiguracion = inject(ApiGestoWeb);
  private readonly avisos = inject(Avisos);

  protected readonly asignaciones = signal<Asignacion[]>([]);
  protected readonly acciones = signal<Accion[]>([]);
  protected readonly cargando = signal(true);
  protected readonly guardando = signal<number | null>(null);
  protected readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      const [asignaciones, acciones] = await Promise.all([this.api.asignaciones(), this.api.acciones()]);
      this.asignaciones.set(asignaciones);
      this.acciones.set(acciones);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.cargando.set(false);
    }
  }

  protected icono(codigo: string): string {
    return infoGesto(codigo)?.icono ?? '✋';
  }

  protected async cambiar(asignacion: Asignacion, idAccion: string): Promise<void> {
    this.guardando.set(asignacion.gesto.id);
    try {
      const nueva = await this.api.cambiarAsignacion(asignacion.gesto.id, Number(idAccion));
      this.asignaciones.update((lista) => lista.map((a) => (a.gesto.id === nueva.gesto.id ? nueva : a)));
      this.avisos.exito(`${nueva.gesto.nombre}: ${nueva.accion?.nombre.toLowerCase()}.`);
    } catch (e) {
      this.avisos.error(e);
      this.asignaciones.update((l) => [...l]); // vuelve a pintar el valor anterior
    } finally {
      this.guardando.set(null);
    }
  }

  protected async restaurar(): Promise<void> {
    if (!confirm('¿Volver a la configuración inicial de los 7 gestos?')) return;
    try {
      this.asignaciones.set(await this.api.restaurarAsignaciones());
      this.avisos.exito('Volviste a la configuración inicial.');
    } catch (e) {
      this.avisos.error(e);
    }
  }
}
