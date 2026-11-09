import { Component, inject, OnInit, signal } from '@angular/core';
import { IconoGesto } from '../../compartido/componentes/icono-gesto';
import { RouterLink } from '@angular/router';
import { Avisos } from '../../compartido/servicios/avisos';
import { infoGesto } from '../../nucleo/dominio/gesto';
import { Accion, Asignacion } from '../../nucleo/dominio/modelos';
import { ApiConfiguracion, PuertoSalidaApiGestoWeb } from '../../nucleo/puerto/salida/puerto-salida-api-gestoweb';

/** RF-12 · El usuario elige qué acción hace cada gesto, o vuelve a la configuración inicial. */
@Component({
  selector: 'app-configuracion',
  imports: [IconoGesto, RouterLink],
  template: `
    <section class="pagina">
      <div class="pagina__titulo">
        <div>
          <span class="pagina__ruta">02 / Mis gestos</span>
          <h1>Mis gestos</h1>
          <p>Qué acción ejecuta cada gesto en el panel de demostración. Los cambios se guardan al elegir.</p>
        </div>
        <button type="button" class="boton boton--fantasma" (click)="restaurar()" [disabled]="cargando()">Restaurar acciones iniciales</button>
      </div>

      @if (error()) {
        <p class="alerta alerta--error" role="alert">{{ error() }}</p>
      }

      @if (cargando()) {
        <p class="texto-suave">Cargando tu configuración…</p>
      } @else {
        <div class="tabla-contenedor">
          <table class="hoja-tabla">
            <thead>
              <tr><th>Gesto</th><th>Código</th><th>Acción</th><th>Estado</th></tr>
            </thead>
            <tbody>
              @for (a of asignaciones(); track a.gesto.id) {
                <tr>
                  <td>
                    <app-icono-gesto class="icono" [codigo]="a.gesto.codigo" [tamano]="30" [decorativo]="true" />
                    <strong>{{ a.gesto.nombre }}</strong>
                  </td>
                  <td class="codigo">{{ a.gesto.codigo.toUpperCase() }}</td>
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
                      <span class="dato texto-suave">GUARDANDO…</span>
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
    .icono { margin-right: 0.6rem; }
    .codigo { font-family: var(--fuente-dato); font-size: 0.8rem; color: var(--tinta-tenue); }
    select { max-width: 22rem; }
    td:last-child { width: 9rem; }
    @media (max-width: 640px) { .codigo, th:nth-child(2) { display: none; } }
  `,
})
export class Configuracion implements OnInit {
  private readonly api: ApiConfiguracion = inject(PuertoSalidaApiGestoWeb);
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
