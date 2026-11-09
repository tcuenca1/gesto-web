import { Component, computed, input } from '@angular/core';
import { ESQUELETOS_GESTO } from '../../nucleo/dominio/esqueletos-gesto';
import { CodigoGesto, CONEXIONES_MANO, infoGesto } from '../../nucleo/dominio/gesto';

/**
 * Ícono de un gesto dibujado como el esqueleto de 21 puntos de MediaPipe
 * (skill interfaz-gestoweb §4). Es el único lugar donde se dibujan los gestos:
 * no se usan emojis ni SVG sueltos.
 *
 * Uso: <app-icono-gesto codigo="Victory" [tamano]="48" />
 * Si el nombre del gesto ya está escrito al lado, pasar [decorativo]="true".
 * Bajo 32 px solo se dibujan los huesos y las puntas: las articulaciones
 * se amontonan y ensucian el ícono.
 */
@Component({
  selector: 'app-icono-gesto',
  template: `
    @if (esqueleto(); as e) {
      <svg
        viewBox="0 0 100 100"
        [attr.width]="tamano()"
        [attr.height]="tamano()"
        [attr.role]="decorativo() ? null : 'img'"
        [attr.aria-label]="decorativo() ? null : nombre()"
        [attr.aria-hidden]="decorativo() ? 'true' : null"
      >
        <g class="huesos">
          @for (c of conexiones; track $index) {
            <line [attr.x1]="e.puntos[c[0]][0]" [attr.y1]="e.puntos[c[0]][1]" [attr.x2]="e.puntos[c[1]][0]" [attr.y2]="e.puntos[c[1]][1]" />
          }
        </g>
        @for (p of e.puntos; track $index; let i = $index) {
          @if (esPunta(i) || tamano() >= 32) {
          <circle [attr.cx]="p[0]" [attr.cy]="p[1]" [attr.r]="esPunta(i) ? 4.5 : 2.6" [class.punta]="esPunta(i)" />
          }
        }
      </svg>
    } @else {
      <span class="desconocido" [style.width.px]="tamano()" [style.height.px]="tamano()" aria-hidden="true"></span>
    }
  `,
  styles: `
    :host { display: inline-flex; vertical-align: middle; color: var(--icono-trazo, var(--tinta)); flex: 0 0 auto; }
    svg { display: block; overflow: visible; }
    .huesos line { stroke: currentColor; stroke-width: 2.5; stroke-linecap: round; }
    circle { fill: var(--icono-fondo, var(--papel)); stroke: currentColor; stroke-width: 1.8; }
    circle.punta { fill: var(--icono-punta, var(--senal)); stroke: var(--icono-punta, var(--senal)); }
    .desconocido { display: block; border: var(--trazo) dashed var(--regla-fuerte); border-radius: 50%; }
  `,
})
export class IconoGesto {
  readonly codigo = input<string | null | undefined>(null);
  readonly tamano = input(40);
  readonly decorativo = input(false);

  protected readonly conexiones = CONEXIONES_MANO;
  protected readonly esqueleto = computed(() => {
    const c = this.codigo();
    return c ? (ESQUELETOS_GESTO[c as CodigoGesto] ?? null) : null;
  });
  protected readonly nombre = computed(() => infoGesto(this.codigo() ?? '')?.nombre ?? 'Gesto');

  protected esPunta(i: number): boolean {
    return this.esqueleto()?.puntas.includes(i) ?? false;
  }
}
