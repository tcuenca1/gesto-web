import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

/** Panel de administración: pestañas para gestos, acciones, usuarios, estadísticas y bitácora. */
@Component({
  selector: 'app-admin',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <section class="pagina">
      <div class="pagina__titulo">
        <div>
          <span class="pagina__ruta">06 / Administración</span>
          <h1>Administración</h1>
          <p>Cada cambio queda en la bitácora con tu nombre.</p>
        </div>
      </div>
      <nav class="pestanas" aria-label="Secciones de administración">
        <a routerLink="gestos" routerLinkActive="activa"><span>01</span>Gestos</a>
        <a routerLink="acciones" routerLinkActive="activa"><span>02</span>Acciones</a>
        <a routerLink="usuarios" routerLinkActive="activa"><span>03</span>Usuarios</a>
        <a routerLink="estadisticas" routerLinkActive="activa"><span>04</span>Estadísticas</a>
        <a routerLink="bitacora" routerLinkActive="activa"><span>05</span>Bitácora</a>
      </nav>
      <router-outlet />
    </section>
  `,
  styles: `
    .pestanas { display: flex; flex-wrap: wrap; margin-bottom: 1.75rem; border: var(--trazo) solid var(--tinta); width: fit-content; max-width: 100%; }
    .pestanas a { display: inline-flex; gap: 0.45rem; align-items: baseline; padding: 0.45rem 0.9rem; text-decoration: none; color: var(--tinta); font-weight: 600; }
    .pestanas a + a { border-left: var(--trazo) solid var(--tinta); }
    .pestanas a span { font-family: var(--fuente-dato); font-size: 0.72rem; font-weight: 400; color: var(--tinta-tenue); }
    .pestanas a:hover { background: var(--hoja); color: var(--tinta); }
    .pestanas a.activa { background: var(--tinta); color: var(--papel); }
    .pestanas a.activa span { color: var(--regla-fuerte); }
  `,
})
export class Admin {}
