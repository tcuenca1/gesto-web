import { afterNextRender, Component, effect, ElementRef, input, OnDestroy, viewChild } from '@angular/core';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  LinearScale,
  LineController,
  LineElement,
  Plugin,
  PointElement,
  Tooltip,
} from 'chart.js';

// Solo se registran las piezas que se usan: el paquete pesa menos.
Chart.register(BarController, BarElement, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip);

interface Colores {
  tinta: string;
  tenue: string;
  regla: string;
  senal: string;
  papel: string;
}

/** Lee los tokens de styles.scss: el gráfico no tiene colores propios. */
function leerColores(): Colores {
  const e = getComputedStyle(document.documentElement);
  const v = (n: string) => e.getPropertyValue(n).trim();
  return { tinta: v('--tinta'), tenue: v('--tinta-tenue'), regla: v('--regla-fuerte'), senal: v('--senal'), papel: v('--papel') };
}

/** Escribe el valor del último punto de una línea, como la lectura actual de un instrumento. */
const valorFinal: Plugin<'line'> = {
  id: 'valorFinal',
  afterDatasetsDraw(chart) {
    const meta = chart.getDatasetMeta(0);
    const punto = meta.data[meta.data.length - 1];
    const valor = chart.data.datasets[0]?.data[meta.data.length - 1];
    if (!punto || valor === undefined) return;
    const { ctx } = chart;
    ctx.save();
    ctx.font = '500 11px "IBM Plex Mono", monospace';
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--senal').trim();
    const cercaDelBorde = punto.x - chart.chartArea.left < 40;
    ctx.textAlign = cercaDelBorde ? 'left' : 'right';
    ctx.fillText(String(valor), punto.x + (cercaDelBorde ? 8 : -8), punto.y - 8);
    ctx.restore();
  },
};

/**
 * Gráfico de barras o líneas con Chart.js (RF-16, RF-21), con el estilo de
 * instrumento de la skill interfaz-gestoweb §5: barras en tinta con una sola
 * destacada en rojo, líneas rectas sin relleno, rejilla punteada, ejes en mono
 * y sin animación.
 */
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
  /** Índice de la barra que se pinta en rojo (por ejemplo, el gesto más usado). */
  readonly destacado = input<number | null>(null);

  private readonly lienzo = viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');
  private grafico: Chart | null = null;
  private colores: Colores | null = null;

  constructor() {
    afterNextRender(() => this.crear());
    effect(() => {
      const etiquetas = this.etiquetas();
      const valores = this.valores();
      const destacado = this.destacado();
      if (!this.grafico || !this.colores) return;
      this.grafico.data.labels = etiquetas;
      const serie = this.grafico.data.datasets[0];
      serie.data = valores;
      if (this.tipo() === 'bar') serie.backgroundColor = this.coloresBarras(valores.length, destacado);
      else {
        const linea = serie as { pointRadius?: number[]; pointBackgroundColor?: string[] };
        linea.pointRadius = this.radiosPuntos(valores.length);
        linea.pointBackgroundColor = this.coloresPuntos(valores.length);
      }
      this.grafico.update();
    });
  }

  ngOnDestroy(): void {
    this.grafico?.destroy();
  }

  private coloresBarras(cantidad: number, destacado: number | null): string[] {
    const c = this.colores!;
    return Array.from({ length: cantidad }, (_, i) => (i === destacado ? c.senal : c.tinta));
  }

  private radiosPuntos(cantidad: number): number[] {
    return Array.from({ length: cantidad }, (_, i) => (i === cantidad - 1 ? 4 : 2));
  }

  /** El último punto de la línea va en rojo: es la lectura más reciente. */
  private coloresPuntos(cantidad: number): string[] {
    const c = this.colores!;
    return Array.from({ length: cantidad }, (_, i) => (i === cantidad - 1 ? c.senal : c.tinta));
  }

  private crear(): void {
    const c = (this.colores = leerColores());
    const esLinea = this.tipo() === 'line';
    const n = this.valores().length;
    const fuenteEje = { family: '"IBM Plex Mono", monospace', size: 11 };
    const rejilla = { color: c.regla, drawTicks: false };

    this.grafico = new Chart(this.lienzo().nativeElement, {
      type: this.tipo(),
      data: {
        labels: this.etiquetas(),
        datasets: [
          {
            label: this.nombreSerie(),
            data: this.valores(),
            backgroundColor: esLinea ? c.tinta : this.coloresBarras(n, this.destacado()),
            borderColor: c.tinta,
            borderWidth: esLinea ? 1.5 : 0,
            borderRadius: 0,
            tension: 0,
            fill: false,
            pointRadius: esLinea ? this.radiosPuntos(n) : 0,
            pointBackgroundColor: this.coloresPuntos(n),
            pointBorderWidth: 0,
            maxBarThickness: 18,
          },
        ],
      },
      options: {
        indexAxis: this.horizontal() ? 'y' : 'x',
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        layout: { padding: { top: esLinea ? 16 : 0 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            intersect: false,
            backgroundColor: c.tinta,
            titleColor: c.papel,
            bodyColor: c.papel,
            cornerRadius: 0,
            displayColors: false,
            titleFont: fuenteEje,
            bodyFont: fuenteEje,
          },
        },
        scales: {
          x: {
            border: { display: !this.horizontal(), color: c.tinta, dash: [2, 3] },
            grid: { display: this.horizontal(), ...rejilla, lineWidth: 1 },
            ticks: { color: c.tenue, precision: 0, font: fuenteEje },
          },
          y: {
            border: { display: this.horizontal(), color: c.tinta, dash: [2, 3] },
            grid: { display: !this.horizontal(), ...rejilla, lineWidth: 1 },
            ticks: { color: c.tenue, precision: 0, font: fuenteEje },
            beginAtZero: true,
          },
        },
      },
      plugins: esLinea ? [valorFinal as Plugin] : [],
    });
  }
}
