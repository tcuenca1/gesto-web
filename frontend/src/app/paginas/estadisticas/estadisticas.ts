import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Grafico } from '../../compartido/componentes/grafico';
import { diaCorto, haceDias, porcentaje } from '../../compartido/utilidades';
import { infoGesto } from '../../nucleo/dominio/gesto';
import { Estadisticas } from '../../nucleo/dominio/modelos';
import { ApiGestoWeb, ApiHistorial } from '../../nucleo/puertos/api-gestoweb';

/** RF-16 · Estadísticas propias: gesto más usado, total por gesto, confianza promedio y uso por día. */
@Component({
  selector: 'app-estadisticas',
  imports: [FormsModule, RouterLink, Grafico],
  template: `
    <section class="pagina">
      <div class="pagina__titulo">
        <div>
          <h1>Mis estadísticas</h1>
          <p>Cómo has usado tus gestos en el periodo elegido.</p>
        </div>
        <div class="campo periodo">
          <label for="periodo">Periodo</label>
          <select id="periodo" [(ngModel)]="periodo" (ngModelChange)="cargar()">
            <option [ngValue]="7">Últimos 7 días</option>
            <option [ngValue]="30">Últimos 30 días</option>
            <option [ngValue]="90">Últimos 90 días</option>
            <option [ngValue]="0">Todo</option>
          </select>
        </div>
      </div>

      @if (error()) {
        <p class="alerta alerta--error" role="alert">{{ error() }}</p>
      }

      @if (datos(); as d) {
        @if (d.totalDetecciones === 0) {
          <div class="panel vacio">
            <p>Aún no hay gestos en este periodo.</p>
            <a class="boton" routerLink="/reconocer">Reconocer gestos</a>
          </div>
        } @else {
          <div class="resumen">
            <div class="panel resumen__principal">
              <span class="resumen__icono" aria-hidden="true">{{ icono(d.gestoMasUsado?.codigo) }}</span>
              <div>
                <p class="resumen__etiqueta">Tu gesto más usado</p>
                <p class="resumen__valor">{{ d.gestoMasUsado?.nombre }}</p>
                <p class="texto-suave">{{ d.gestoMasUsado?.total }} veces</p>
              </div>
            </div>
            <div class="panel">
              <p class="resumen__etiqueta">Gestos aceptados</p>
              <p class="resumen__valor">{{ d.totalDetecciones }}</p>
            </div>
            <div class="panel">
              <p class="resumen__etiqueta">Confianza promedio</p>
              <p class="resumen__valor">{{ porcentaje(d.confianzaPromedio) }}</p>
            </div>
          </div>

          <div class="graficos">
            <div class="panel">
              <h2>Total por gesto</h2>
              <app-grafico [etiquetas]="etiquetasGestos()" [valores]="valoresGestos()" [horizontal]="true" descripcion="Cantidad de veces que usaste cada gesto" />
            </div>
            <div class="panel">
              <h2>Uso por día</h2>
              <app-grafico tipo="line" [etiquetas]="etiquetasDias()" [valores]="valoresDias()" descripcion="Gestos aceptados por día" />
            </div>
          </div>

          <div class="panel tabla-contenedor">
            <h2>Detalle por gesto</h2>
            <table>
              <thead><tr><th>Gesto</th><th>Veces</th><th>Confianza promedio</th></tr></thead>
              <tbody>
                @for (g of d.totalesPorGesto; track g.idGesto) {
                  <tr>
                    <td><span aria-hidden="true">{{ icono(g.codigo) }}</span> {{ g.nombre }}</td>
                    <td>{{ g.total }}</td>
                    <td>{{ g.total ? porcentaje(g.confianzaPromedio) : '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      } @else if (!error()) {
        <p class="texto-suave">Cargando…</p>
      }
    </section>
  `,
  styleUrl: './estadisticas.scss',
})
export class EstadisticasPagina implements OnInit {
  private readonly api: ApiHistorial = inject(ApiGestoWeb);

  protected periodo = 30;
  protected readonly datos = signal<Estadisticas | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly porcentaje = porcentaje;

  protected readonly etiquetasGestos = computed(() => this.datos()?.totalesPorGesto.map((g) => g.nombre) ?? []);
  protected readonly valoresGestos = computed(() => this.datos()?.totalesPorGesto.map((g) => g.total) ?? []);
  protected readonly etiquetasDias = computed(() => this.datos()?.usoPorDia.map((d) => diaCorto(d.dia)) ?? []);
  protected readonly valoresDias = computed(() => this.datos()?.usoPorDia.map((d) => d.total) ?? []);

  ngOnInit(): void {
    void this.cargar();
  }

  protected icono(codigo?: string): string {
    return (codigo && infoGesto(codigo)?.icono) || '✋';
  }

  protected async cargar(): Promise<void> {
    this.error.set(null);
    try {
      this.datos.set(await this.api.estadisticas({ desde: this.periodo ? haceDias(this.periodo - 1) : undefined }));
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }
}
