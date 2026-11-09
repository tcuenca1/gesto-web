import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { IconoGesto } from '../../compartido/componentes/icono-gesto';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Avisos } from '../../compartido/servicios/avisos';
import { descargarArchivo, fechaHora, finDelDia, inicioDelDia, porcentaje } from '../../compartido/utilidades';
import { GUIA_GESTOS, infoGesto } from '../../nucleo/dominio/gesto';
import { Deteccion, FiltroHistorial } from '../../nucleo/dominio/modelos';
import { PuertoSalidaApiGestoWeb, ApiHistorial } from '../../nucleo/puerto/salida/puerto-salida-api-gestoweb';

/** RF-15 y RF-17 · Historial propio con filtros por fecha y gesto, y descarga en CSV. */
@Component({
  selector: 'app-historial',
  imports: [IconoGesto, FormsModule, RouterLink],
  template: `
    <section class="pagina">
      <div class="pagina__titulo">
        <div>
          <span class="pagina__ruta">03 / Historial</span>
          <h1>Historial</h1>
          <p>Registro de gestos aceptados: hora, acción, confianza y mano. No se guardan imágenes.</p>
        </div>
        <button type="button" class="boton boton--fantasma" (click)="descargar()" [disabled]="descargando() || total() === 0">
          {{ descargando() ? 'Preparando CSV…' : 'Exportar CSV' }}
        </button>
      </div>

      <form class="filtros" (ngSubmit)="buscar(1)">
        <div class="campo">
          <label for="desde">Desde</label>
          <input id="desde" type="date" name="desde" [(ngModel)]="desde" />
        </div>
        <div class="campo">
          <label for="hasta">Hasta</label>
          <input id="hasta" type="date" name="hasta" [(ngModel)]="hasta" />
        </div>
        <div class="campo">
          <label for="gesto">Gesto</label>
          <select id="gesto" name="gesto" [(ngModel)]="gesto">
            <option value="">Todos</option>
            @for (g of gestos; track g.codigo) {
              <option [value]="g.codigo">{{ g.nombre }}</option>
            }
          </select>
        </div>
        <div class="filtros__botones">
          <button class="boton" type="submit">Filtrar</button>
          <button class="boton boton--fantasma" type="button" (click)="limpiar()">Limpiar</button>
        </div>
      </form>

      @if (error()) {
        <p class="alerta alerta--error" role="alert">{{ error() }}</p>
      }

      <div class="registro">
        @if (cargando()) {
          <p class="texto-suave">Cargando…</p>
        } @else if (filas().length === 0) {
          <div class="vacio">
            <p>{{ hayFiltros() ? 'No hay gestos con esos filtros.' : 'Todavía no tienes gestos guardados.' }}</p>
            @if (!hayFiltros()) {
              <a class="boton" routerLink="/reconocer">Reconocer gestos</a>
            }
          </div>
        } @else {
          <div class="tabla-contenedor">
            <table class="hoja-tabla">
              <thead>
                <tr><th>Fecha y hora</th><th>Gesto</th><th>Acción</th><th class="num">Confianza</th><th>Mano</th></tr>
              </thead>
              <tbody>
                @for (d of filas(); track d.id) {
                  <tr>
                    <td class="dato">{{ fecha(d.fechaHora) }}</td>
                    <td><app-icono-gesto [codigo]="d.codigoGesto" [tamano]="22" [decorativo]="true" /> {{ d.nombreGesto }}</td>
                    <td>{{ d.nombreAccion ?? '—' }}</td>
                    <td class="num">{{ porcentaje(d.confianza) }}</td>
                    <td>{{ d.mano }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <nav class="paginacion" aria-label="Páginas del historial">
            <span class="dato texto-suave">{{ total() }} registros · página {{ pagina() }} / {{ paginas() }}</span>
            <div>
              <button class="boton boton--fantasma boton--chico" type="button" (click)="buscar(pagina() - 1)" [disabled]="pagina() <= 1">Anterior</button>
              <button class="boton boton--fantasma boton--chico" type="button" (click)="buscar(pagina() + 1)" [disabled]="pagina() >= paginas()">Siguiente</button>
            </div>
          </nav>
        }
      </div>
    </section>
  `,
  styles: `
    .filtros { display: flex; flex-wrap: wrap; gap: 0 1.5rem; align-items: flex-end; margin-bottom: 1.5rem; padding-bottom: 0.25rem; border-bottom: var(--trazo) solid var(--regla-fuerte); }
    .filtros .campo { min-width: 10rem; flex: 1; }
    .filtros__botones { display: flex; gap: 0.5rem; margin-bottom: 1.25rem; }
    .paginacion { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; margin-top: 1rem; }
    .paginacion div { display: flex; gap: 0.5rem; }
    td:first-child { white-space: nowrap; }
  `,
})
export class Historial implements OnInit {
  private readonly api: ApiHistorial = inject(PuertoSalidaApiGestoWeb);
  private readonly avisos = inject(Avisos);

  protected readonly gestos = GUIA_GESTOS;
  protected readonly fecha = fechaHora;
  protected readonly porcentaje = porcentaje;

  protected desde = '';
  protected hasta = '';
  protected gesto = '';

  protected readonly filas = signal<Deteccion[]>([]);
  protected readonly total = signal(0);
  protected readonly pagina = signal(1);
  protected readonly limite = 20;
  protected readonly paginas = computed(() => Math.max(1, Math.ceil(this.total() / this.limite)));
  protected readonly cargando = signal(true);
  protected readonly descargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly hayFiltros = signal(false);

  ngOnInit(): void {
    void this.buscar(1);
  }


  protected async buscar(pagina: number): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const r = await this.api.historial({ ...this.filtro(), pagina, limite: this.limite });
      this.filas.set(r.elementos);
      this.total.set(r.total);
      this.pagina.set(r.pagina);
      this.hayFiltros.set(!!(this.desde || this.hasta || this.gesto));
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.cargando.set(false);
    }
  }

  protected limpiar(): void {
    this.desde = this.hasta = this.gesto = '';
    void this.buscar(1);
  }

  protected async descargar(): Promise<void> {
    this.descargando.set(true);
    try {
      const { nombreArchivo, contenido } = await this.api.descargarCsv(this.filtro());
      descargarArchivo(nombreArchivo, contenido);
    } catch (e) {
      this.avisos.error(e);
    } finally {
      this.descargando.set(false);
    }
  }

  private filtro(): FiltroHistorial {
    return { desde: inicioDelDia(this.desde), hasta: finDelDia(this.hasta), gesto: this.gesto || undefined };
  }
}
