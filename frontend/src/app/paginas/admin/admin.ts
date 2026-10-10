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
          <h1>Administración</h1>
          <p>Los cambios quedan registrados en la bitácora con tu nombre.</p>
        </div>
      </div>
      <nav class="pestanas" aria-label="Secciones de administración">
        <a routerLink="gestos" routerLinkActive="activa">Gestos</a>
        <a routerLink="acciones" routerLinkActive="activa">Acciones</a>
        <a routerLink="usuarios" routerLinkActive="activa">Usuarios</a>
        <a routerLink="estadisticas" routerLinkActive="activa">Estadísticas</a>
        <a routerLink="bitacora" routerLinkActive="activa">Bitácora</a>
      </nav>
      <router-outlet />
    </section>
  `,
  styles: `
    .pestanas { display: flex; gap: 0.25rem; flex-wrap: wrap; border-bottom: 2px solid var(--linea); margin-bottom: 1.5rem; }
    .pestanas a { padding: 0.6rem 1rem; text-decoration: none; color: var(--tinta-suave); font-weight: 700; border-bottom: 3px solid transparent; margin-bottom: -2px; }
    .pestanas a:hover { color: var(--tinta); }
    .pestanas a.activa { color: var(--cobalto); border-bottom-color: var(--cobalto); }
  `,
})
export class Admin {}
