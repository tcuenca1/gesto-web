import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Grafico } from '../../compartido/componentes/grafico';
import { Avisos } from '../../compartido/servicios/avisos';
import { diaCorto, haceDias, porcentaje } from '../../compartido/utilidades';
import { EstadisticasGenerales } from '../../nucleo/dominio/modelos';
import { ApiAdministracion, PuertoSalidaApiGestoWeb } from '../../nucleo/puerto/salida/puerto-salida-api-gestoweb';

/** RF-21 · Estadísticas de todo el sistema. */
@Component({
  selector: 'app-admin-estadisticas',
  imports: [Grafico],
  template: `
    @if (datos(); as d) {
      <section class="panel">
        <h2>Lecturas del sistema</h2>
        <dl class="cifras">
          <div><dt>Usuarios</dt><dd>{{ d.totalUsuarios }}</dd></div>
          <div><dt>Sesiones de cámara</dt><dd>{{ d.totalSesiones }}</dd></div>
          <div><dt>Gestos aceptados</dt><dd>{{ d.totalDetecciones }}</dd></div>
          <div><dt>Confianza promedio</dt><dd>{{ porcentaje(d.resumen.confianzaPromedio) }}</dd></div>
        </dl>
      </section>
      <div class="graficos">
        <div class="panel">
          <h2>Uso de cada gesto (histórico)</h2>
          <app-grafico [etiquetas]="etiquetas()" [valores]="valores()" [horizontal]="true" descripcion="Uso de cada gesto en todo el sistema" />
        </div>
        <div class="panel">
          <h2>Gestos por día, últimos 30 días</h2>
          <app-grafico tipo="line" [etiquetas]="dias()" [valores]="totalesDia()" descripcion="Gestos por día en todo el sistema" />
        </div>
      </div>
      <div class="tabla-contenedor">
        <table class="hoja-tabla">
          <thead><tr><th>Gesto</th><th>Estado</th><th class="num">Veces</th><th class="num">Confianza promedio</th><th class="num">Personas</th></tr></thead>
          <tbody>
            @for (g of d.usoPorGesto; track g.idGesto) {
              <tr>
                <td>{{ g.nombre }}</td>
                <td><span class="etiqueta" [class.etiqueta--apagada]="!g.activo">{{ g.activo ? 'Activo' : 'Desactivado' }}</span></td>
                <td class="num">{{ g.total }}</td>
                <td class="num">{{ g.total ? porcentaje(g.confianzaPromedio) : '—' }}</td>
                <td class="num">{{ g.usuariosDistintos }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else {
      <p class="texto-suave">Cargando…</p>
    }
  `,
  styleUrl: './admin.scss',
})
export class AdminEstadisticas implements OnInit {
  private readonly api: ApiAdministracion = inject(PuertoSalidaApiGestoWeb);
  private readonly avisos = inject(Avisos);
  protected readonly datos = signal<EstadisticasGenerales | null>(null);
  protected readonly porcentaje = porcentaje;
  protected readonly etiquetas = computed(() => this.datos()?.usoPorGesto.map((g) => g.nombre) ?? []);
  protected readonly valores = computed(() => this.datos()?.usoPorGesto.map((g) => g.total) ?? []);
  protected readonly dias = computed(() => this.datos()?.usoPorDia.map((d) => diaCorto(d.dia)) ?? []);
  protected readonly totalesDia = computed(() => this.datos()?.usoPorDia.map((d) => d.total) ?? []);

  async ngOnInit(): Promise<void> {
    try {
      this.datos.set(await this.api.estadisticasGenerales({ desde: haceDias(29) }));
    } catch (e) {
      this.avisos.error(e);
    }
  }
}
