import { IconoGesto } from '../../compartido/componentes/icono-gesto';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Grafico } from '../../compartido/componentes/grafico';
import { diaCorto, haceDias, porcentaje } from '../../compartido/utilidades';
import { Estadisticas } from '../../nucleo/dominio/modelos';
import { PuertoSalidaApiGestoWeb, ApiHistorial } from '../../nucleo/puerto/salida/puerto-salida-api-gestoweb';

/** RF-16 · Estadísticas propias: gesto más usado, total por gesto, confianza promedio y uso por día. */
@Component({
  selector: 'app-estadisticas',
  imports: [IconoGesto, FormsModule, RouterLink, Grafico],
  template: `
    <section class="pagina">
      <div class="pagina__titulo">
        <div>
          <span class="pagina__ruta">04 / Estadísticas</span>
          <h1>Estadísticas</h1>
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
          <div class="vacio">
            <p>No hay gestos aceptados en este periodo.</p>
            <a class="boton" routerLink="/reconocer">Reconocer gestos</a>
          </div>
        } @else {
          <section class="panel">
            <h2>Lecturas</h2>
            <dl class="lecturas">
              <div>
                <dt>Gestos aceptados</dt>
                <dd>{{ d.totalDetecciones }}</dd>
              </div>
              <div>
                <dt>Confianza promedio</dt>
                <dd>{{ porcentaje(d.confianzaPromedio) }}</dd>
              </div>
              <div class="lecturas__gesto">
                <dt>Gesto más usado</dt>
                <dd>
                  <app-icono-gesto [codigo]="d.gestoMasUsado?.codigo" [tamano]="40" [decorativo]="true" />
                  <span>{{ d.gestoMasUsado?.nombre }}</span>
                  <span class="lecturas__veces">{{ d.gestoMasUsado?.total }} veces</span>
                </dd>
              </div>
            </dl>
          </section>

          <section class="panel">
            <h2>Total por gesto</h2>
            <app-grafico [etiquetas]="etiquetasGestos()" [valores]="valoresGestos()" [horizontal]="true" [destacado]="indiceMasUsado()" descripcion="Cantidad de veces que usaste cada gesto" />
          </section>

          <section class="panel">
            <h2>Uso por día</h2>
            <app-grafico tipo="line" [etiquetas]="etiquetasDias()" [valores]="valoresDias()" descripcion="Gestos aceptados por día" />
          </section>

          <section class="panel tabla-contenedor">
            <h2>Detalle por gesto</h2>
            <table class="hoja-tabla">
              <thead><tr><th>Gesto</th><th class="num">Veces</th><th class="num">Confianza promedio</th></tr></thead>
              <tbody>
                @for (g of d.totalesPorGesto; track g.idGesto) {
                  <tr>
                    <td><app-icono-gesto [codigo]="g.codigo" [tamano]="22" [decorativo]="true" /> {{ g.nombre }}</td>
                    <td class="num">{{ g.total }}</td>
                    <td class="num">{{ g.total ? porcentaje(g.confianzaPromedio) : '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </section>
        }
      } @else if (!error()) {
        <p class="texto-suave">Cargando…</p>
      }
    </section>
  `,
  styleUrl: './estadisticas.scss',
})
export class EstadisticasPagina implements OnInit {
  private readonly api: ApiHistorial = inject(PuertoSalidaApiGestoWeb);

  protected periodo = 30;
  protected readonly datos = signal<Estadisticas | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly porcentaje = porcentaje;

  protected readonly etiquetasGestos = computed(() => this.datos()?.totalesPorGesto.map((g) => g.nombre) ?? []);
  protected readonly valoresGestos = computed(() => this.datos()?.totalesPorGesto.map((g) => g.total) ?? []);
  protected readonly etiquetasDias = computed(() => this.datos()?.usoPorDia.map((d) => diaCorto(d.dia)) ?? []);
  protected readonly indiceMasUsado = computed(() => {
    const d = this.datos();
    const i = d?.totalesPorGesto.findIndex((g) => g.codigo === d.gestoMasUsado?.codigo) ?? -1;
    return i >= 0 ? i : null;
  });
  protected readonly valoresDias = computed(() => this.datos()?.usoPorDia.map((d) => d.total) ?? []);

  ngOnInit(): void {
    void this.cargar();
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
