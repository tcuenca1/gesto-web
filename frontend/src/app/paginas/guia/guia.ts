import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GUIA_GESTOS } from '../../nucleo/dominio/gesto';

/** RF-13 · Guía visual de los 7 gestos y consejos para que se reconozcan bien. */
@Component({
  selector: 'app-guia',
  imports: [RouterLink],
  template: `
    <section class="pagina">
      <div class="pagina__titulo">
        <div>
          <h1>Guía de gestos</h1>
          <p>Estos son los siete gestos que GestoWeb reconoce. Haz uno a la vez, con una sola mano, y mantenlo quieto medio segundo.</p>
        </div>
      </div>

      <ul class="guia">
        @for (g of gestos; track g.codigo) {
          <li class="panel">
            <span class="guia__icono" aria-hidden="true">{{ g.icono }}</span>
            <div>
              <h2>{{ g.nombre }}</h2>
              <p>{{ g.comoSeHace }}</p>
              <p class="texto-suave">{{ g.consejo }}</p>
            </div>
          </li>
        }
      </ul>

      <h2>Para que te reconozca a la primera</h2>
      <ul class="consejos">
        <li>Busca buena luz de frente; evita tener una ventana detrás.</li>
        <li>Deja la mano completa dentro de la imagen, a unos 40–70 cm de la cámara.</li>
        <li>Usa un fondo sencillo: una pared lisa funciona mejor que una repisa llena de cosas.</li>
        <li>Si el gesto se confunde con otro, exagéralo un poco y mira la confianza en pantalla.</li>
      </ul>
      <p><a class="boton" routerLink="/reconocer">Probar en Reconocer</a></p>
    </section>
  `,
  styles: `
    .guia { list-style: none; padding: 0; margin: 0 0 2.5rem; display: grid; grid-template-columns: repeat(auto-fill, minmax(19rem, 1fr)); gap: 1rem; }
    .guia li { display: flex; gap: 1rem; align-items: flex-start; }
    .guia h2 { font-size: 1.2rem; margin-bottom: 0.25rem; }
    .guia p { margin: 0 0 0.35rem; }
    .guia__icono { font-size: 3.25rem; line-height: 1; flex: 0 0 auto; width: 4.5rem; height: 4.5rem; display: grid; place-items: center; background: var(--cobalto-claro); border-radius: 50%; }
    .consejos { max-width: 65ch; padding-left: 1.2rem; margin-bottom: 1.5rem; }
    .consejos li { margin-bottom: 0.4rem; }
  `,
})
export class GuiaPagina {
  protected readonly gestos = GUIA_GESTOS;
}
