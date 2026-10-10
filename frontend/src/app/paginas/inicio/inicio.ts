import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SesionUsuario } from '../../compartido/servicios/sesion-usuario';
import { GUIA_GESTOS } from '../../nucleo/dominio/gesto';

const ACCIONES_INICIALES: Record<string, string> = {
  Open_Palm: 'Reproducir o pausar el pase',
  Closed_Fist: 'Detener y volver al inicio',
  Pointing_Up: 'Siguiente imagen',
  Victory: 'Imagen anterior',
  Thumb_Up: 'Marcar como favorita',
  Thumb_Down: 'Quitar de favoritas',
  ILoveYou: 'Reacción de corazón',
};

/** Página de inicio para visitantes. */
@Component({
  selector: 'app-inicio',
  imports: [RouterLink],
  template: `
    <section class="portada">
      <div class="portada__interior">
        <div class="portada__texto">
          <h1>Controla la página con un gesto de tu mano</h1>
          <p class="portada__bajada">
            GestoWeb reconoce siete gestos con la cámara de tu computador y los convierte en acciones:
            pasar de imagen, pausar, marcar favoritas.
          </p>
          <div class="portada__botones">
            @if (sesion.autenticado()) {
              <a class="boton boton--grande boton--marcador" routerLink="/reconocer">Ir a reconocer gestos</a>
            } @else {
              <a class="boton boton--grande boton--marcador" routerLink="/registro">Crear cuenta</a>
              <a class="boton boton--grande boton--claro" routerLink="/entrar">Ya tengo cuenta</a>
            }
          </div>
          <p class="portada__privacidad">
            La imagen de tu cámara se analiza en tu navegador y nunca sale de tu computador.
            Al servidor solo llega qué gesto hiciste, con qué seguridad y a qué hora.
          </p>
        </div>

        <div class="demo" aria-hidden="true">
          <span class="demo__gesto">{{ actual().icono }}</span>
          <span class="demo__nombre">{{ actual().nombre }}</span>
          <span class="demo__accion">{{ accionActual() }}</span>
          <div class="demo__puntos">
            @for (g of gestos; track g.codigo; let i = $index) {
              <span [class.activo]="i === indice()"></span>
            }
          </div>
        </div>
      </div>
    </section>

    <section class="pagina pasos-seccion">
      <h2>Cómo funciona</h2>
      <ol class="pasos">
        <li><strong>Enciende la cámara.</strong> El navegador te pide permiso una sola vez.</li>
        <li><strong>Haz un gesto y mantenlo medio segundo.</strong> Así evitamos acciones por movimientos de paso.</li>
        <li><strong>La página hace la acción.</strong> Y la guarda en tu historial para ver tus estadísticas.</li>
      </ol>

      <h2 class="gestos-titulo">Los siete gestos</h2>
      <ul class="gestos">
        @for (g of gestos; track g.codigo) {
          <li>
            <span class="gestos__icono" aria-hidden="true">{{ g.icono }}</span>
            <strong>{{ g.nombre }}</strong>
            <span>{{ acciones[g.codigo] }}</span>
          </li>
        }
      </ul>
      <p class="texto-suave">Puedes cambiar qué hace cada gesto desde tu cuenta. <a routerLink="/guia">Ver cómo se hace cada uno</a>.</p>
    </section>
  `,
  styleUrl: './inicio.scss',
})
export class Inicio implements OnInit, OnDestroy {
  protected readonly sesion = inject(SesionUsuario);
  protected readonly gestos = GUIA_GESTOS;
  protected readonly acciones = ACCIONES_INICIALES;
  protected readonly indice = signal(0);
  protected readonly actual = computed(() => this.gestos[this.indice()]);
  protected readonly accionActual = computed(() => this.acciones[this.actual().codigo]);
  private temporizador: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    // Un solo movimiento en la página: el gesto de la portada cambia solo (salvo con "reducir movimiento").
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.temporizador = setInterval(() => this.indice.update((i) => (i + 1) % this.gestos.length), 2200);
    }
  }

  ngOnDestroy(): void {
    if (this.temporizador) clearInterval(this.temporizador);
  }
}
