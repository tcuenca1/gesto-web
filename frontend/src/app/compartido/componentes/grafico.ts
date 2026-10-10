import { afterNextRender, Component, effect, ElementRef, input, OnDestroy, viewChild } from '@angular/core';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Filler,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';

// Solo se registran las piezas que se usan: el paquete pesa menos.
Chart.register(BarController, BarElement, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Filler);

/** Gráfico simple de barras o líneas con Chart.js (RF-16, RF-21). */
@Component({
  selector: 'app-grafico',
  template: `<div class="lienzo"><canvas #lienzo role="img" [attr.aria-label]="descripcion()"></canvas></div>`,
  styles: `.lienzo { position: relative; height: var(--alto-grafico, 260px); }`,
})
export class Grafico implements OnDestroy {
  readonly tipo = input<'bar' | 'line'>('bar');
  readonly etiquetas = input.required<string[]>();
  readonly valores = input.required<number[]>();
  readonly nombreSerie = input('Detecciones');
  readonly descripcion = input('Gráfico');
  readonly horizontal = input(false);

  private readonly lienzo = viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');
  private grafico: Chart | null = null;

  constructor() {
    afterNextRender(() => this.crear());
    effect(() => {
      const etiquetas = this.etiquetas();
      const valores = this.valores();
      if (!this.grafico) return;
      this.grafico.data.labels = etiquetas;
      this.grafico.data.datasets[0].data = valores;
      this.grafico.update();
    });
  }

  ngOnDestroy(): void {
    this.grafico?.destroy();
  }

  private crear(): void {
    const estilos = getComputedStyle(document.documentElement);
    const color = (nombre: string) => estilos.getPropertyValue(nombre).trim();
    const tinta = color('--tinta-suave') || '#4a5872';
    const linea = color('--linea') || '#dbe1ec';
    const acento = color('--cobalto') || '#2b59c3';

    this.grafico = new Chart(this.lienzo().nativeElement, {
      type: this.tipo(),
      data: {
        labels: this.etiquetas(),
        datasets: [
          {
            label: this.nombreSerie(),
            data: this.valores(),
            backgroundColor: this.tipo() === 'line' ? acento + '22' : acento,
            borderColor: acento,
            borderWidth: this.tipo() === 'line' ? 2 : 0,
            borderRadius: 4,
            fill: this.tipo() === 'line',
            tension: 0.3,
            pointRadius: 3,
            maxBarThickness: 36,
          },
        ],
      },
      options: {
        indexAxis: this.horizontal() ? 'y' : 'x',
        responsive: true,
        maintainAspectRatio: false,
        animation: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 400 },
        plugins: { legend: { display: false }, tooltip: { intersect: false } },
        scales: {
          x: { grid: { display: this.horizontal(), color: linea }, ticks: { color: tinta, precision: 0 } },
          y: { grid: { display: !this.horizontal(), color: linea }, ticks: { color: tinta, precision: 0 }, beginAtZero: true },
        },
      },
    });
  }
}
