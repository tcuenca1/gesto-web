import { Component } from '@angular/core';
import { IconoGesto } from '../../compartido/componentes/icono-gesto';
import { RouterLink } from '@angular/router';
import { GUIA_GESTOS } from '../../nucleo/dominio/gesto';

/** RF-13 · Guía visual de los 7 gestos y consejos para que se reconozcan bien. */
@Component({
  selector: 'app-guia',
  imports: [IconoGesto, RouterLink],
  template: `
    <section class="pagina">
      <div class="pagina__titulo">
        <div>
          <span class="pagina__ruta">05 / Guía</span>
          <h1>Guía de gestos</h1>
          <p>Los siete gestos que reconoce GestoWeb. Una mano a la vez, quieta durante 0,5 s.</p>
        </div>
      </div>

      <ol class="guia">
        @for (g of gestos; track g.codigo; let i = $index) {
          <li>
            <app-icono-gesto class="guia__icono" [codigo]="g.codigo" [tamano]="96" />
            <div>
              <span class="guia__codigo">{{ i + 1 }} · {{ g.codigo.toUpperCase() }}</span>
              <h2>{{ g.nombre }}</h2>
              <p>{{ g.comoSeHace }}</p>
              <p class="guia__consejo"><span class="etiqueta-dato">Error típico</span>{{ g.consejo }}</p>
            </div>
          </li>
        }
      </ol>

      <h2 class="guia__subtitulo">Condiciones de lectura</h2>
      <ul class="consejos">
        <li>Busca buena luz de frente; evita tener una ventana detrás.</li>
        <li>Deja la mano completa dentro de la imagen, a unos 40–70 cm de la cámara.</li>
        <li>Usa un fondo sencillo: una pared lisa funciona mejor que una repisa llena de cosas.</li>
        <li>Si el gesto se confunde con otro, exagéralo un poco y mira la confianza en pantalla.</li>
      </ul>
      <p><a class="boton boton--senal" routerLink="/reconocer">Probar en Reconocer</a></p>
    </section>
  `,
  styles: `
    .guia { list-style: none; padding: 0; margin: 0 0 2.5rem; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); border-top: var(--trazo-fuerte) solid var(--tinta); }
    .guia li { display: flex; gap: 1.5rem; align-items: flex-start; padding: 1.5rem 1.5rem 1.5rem 0; border-bottom: var(--trazo) solid var(--regla-fuerte); }
    .guia li:nth-child(even) { padding-left: 1.5rem; border-left: var(--trazo) solid var(--regla-fuerte); }
    .guia h2 { font-size: 1.35rem; margin-bottom: 0.35rem; }
    .guia p { margin: 0 0 0.5rem; }
    .guia__icono { flex: 0 0 auto; }
    .guia__codigo { font-family: var(--fuente-dato); font-size: 0.75rem; color: var(--tinta-tenue); }
    .guia__consejo { color: var(--tinta-media); }
    .guia__consejo .etiqueta-dato { color: var(--senal); }
    .guia__subtitulo { font-family: var(--fuente-dato); font-size: 0.78rem; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: var(--tinta-media); }
    @media (max-width: 760px) { .guia { grid-template-columns: 1fr; } .guia li:nth-child(even) { padding-left: 0; border-left: 0; } }
    .consejos { max-width: 65ch; padding-left: 1.2rem; margin-bottom: 1.5rem; }
    .consejos li { margin-bottom: 0.4rem; }
  `,
})
export class GuiaPagina {
  protected readonly gestos = GUIA_GESTOS;
}
