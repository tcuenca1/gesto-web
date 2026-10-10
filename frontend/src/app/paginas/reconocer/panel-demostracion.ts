import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { MotorReconocimiento } from '../../nucleo/servicios/motor-reconocimiento';
import { SesionUsuario } from '../../compartido/servicios/sesion-usuario';

interface Imagen {
  archivo: string;
  titulo: string;
}

const IMAGENES: Imagen[] = [
  { archivo: 'assets/panel/1-volcan.svg', titulo: 'Volcán al amanecer' },
  { archivo: 'assets/panel/2-isla.svg', titulo: 'Isla y mar' },
  { archivo: 'assets/panel/3-ciudad.svg', titulo: 'Ciudad junto al río' },
  { archivo: 'assets/panel/4-bosque.svg', titulo: 'Bosque lluvioso' },
  { archivo: 'assets/panel/5-desierto.svg', titulo: 'Desierto al mediodía' },
  { archivo: 'assets/panel/6-noche.svg', titulo: 'Noche estrellada' },
];

const SEGUNDOS_POR_IMAGEN = 3;

/**
 * Panel de demostración (SRS §3): un visor de imágenes tipo presentación.
 *
 * Al iniciarse registra en el ejecutor del motor lo que sabe hacer con cada
 * código de acción. El motor no conoce el panel; el panel no conoce la
 * cámara. Se comunican solo por los códigos de acción.
 */
@Component({
  selector: 'app-panel-demostracion',
  template: `
    <figure class="visor" [class.visor--favorita]="esFavorita()">
      <img [src]="actual().archivo" [alt]="actual().titulo" width="960" height="600" />

      <figcaption class="visor__pie">
        <span class="visor__titulo">{{ actual().titulo }}</span>
        <span class="visor__contador">{{ indice() + 1 }} de {{ imagenes.length }}</span>
      </figcaption>

      <div class="visor__estado">
        @if (reproduciendo()) {
          <span class="chip chip--vivo">Pase automático</span>
        }
        @if (esFavorita()) {
          <span class="chip chip--favorita">★ Favorita</span>
        }
      </div>

      @if (reproduciendo()) {
        <!-- Se vuelve a crear en cada imagen para que la barra empiece de cero. -->
        @for (ciclo of [indice()]; track ciclo) {
          <div class="visor__progreso" [style.animation-duration.s]="segundos"></div>
        }
      }

      @for (c of corazones(); track c.id) {
        <span class="corazon" [style.left.%]="c.x" aria-hidden="true">❤️</span>
      }
      <span class="oculto-visual" aria-live="polite">{{ anuncio() }}</span>
    </figure>

    <div class="miniaturas" role="list" aria-label="Imágenes">
      @for (img of imagenes; track img.archivo; let i = $index) {
        <button
          type="button"
          role="listitem"
          class="miniatura"
          [class.miniatura--actual]="i === indice()"
          [attr.aria-current]="i === indice()"
          [attr.aria-label]="img.titulo + (favoritas().has(i) ? ', favorita' : '')"
          (click)="ir(i)"
        >
          <img [src]="img.archivo" alt="" loading="lazy" />
          @if (favoritas().has(i)) {
            <span class="miniatura__estrella" aria-hidden="true">★</span>
          }
        </button>
      }
    </div>
  `,
  styleUrl: './panel-demostracion.scss',
})
export class PanelDemostracion implements OnInit, OnDestroy {
  private readonly motor = inject(MotorReconocimiento);
  private readonly sesion = inject(SesionUsuario);

  protected readonly imagenes = IMAGENES;
  protected readonly segundos = SEGUNDOS_POR_IMAGEN;
  protected readonly indice = signal(0);
  protected readonly reproduciendo = signal(false);
  protected readonly favoritas = signal<Set<number>>(this.leerFavoritas());
  protected readonly corazones = signal<Array<{ id: number; x: number }>>([]);
  protected readonly anuncio = signal('');
  protected readonly actual = computed(() => this.imagenes[this.indice()]);
  protected readonly esFavorita = computed(() => this.favoritas().has(this.indice()));

  private temporizador: ReturnType<typeof setInterval> | null = null;
  private quitarManejadores: () => void = () => undefined;
  private idCorazon = 0;

  ngOnInit(): void {
    // Principio abierto/cerrado: el panel agrega sus acciones sin tocar el ejecutor.
    this.quitarManejadores = this.motor.ejecutor.registrarVarios({
      REPRODUCIR_PAUSAR: () => this.alternarPase(),
      DETENER: () => this.detener(),
      SIGUIENTE: () => this.mover(1),
      ANTERIOR: () => this.mover(-1),
      MARCAR_FAVORITA: () => this.marcarFavorita(true),
      QUITAR_FAVORITA: () => this.marcarFavorita(false),
      CORAZON: () => this.mostrarCorazon(),
    });
  }

  ngOnDestroy(): void {
    this.quitarManejadores();
    this.pararTemporizador();
  }

  protected ir(i: number): void {
    this.indice.set(i);
    this.reiniciarTemporizador();
  }

  private mover(paso: number): void {
    const n = this.imagenes.length;
    this.indice.update((i) => (i + paso + n) % n);
    this.reiniciarTemporizador();
    this.anuncio.set(`Imagen ${this.indice() + 1}: ${this.actual().titulo}`);
  }

  private alternarPase(): void {
    this.reproduciendo.update((r) => !r);
    if (this.reproduciendo()) this.reiniciarTemporizador();
    else this.pararTemporizador();
    this.anuncio.set(this.reproduciendo() ? 'Pase automático iniciado' : 'Pase automático en pausa');
  }

  private detener(): void {
    this.reproduciendo.set(false);
    this.pararTemporizador();
    this.indice.set(0);
    this.anuncio.set('Pase detenido, primera imagen');
  }

  private marcarFavorita(marcar: boolean): void {
    this.favoritas.update((f) => {
      const nuevas = new Set(f);
      if (marcar) nuevas.add(this.indice());
      else nuevas.delete(this.indice());
      return nuevas;
    });
    this.guardarFavoritas();
    this.anuncio.set(marcar ? 'Marcada como favorita' : 'Quitada de favoritas');
  }

  private mostrarCorazon(): void {
    const id = ++this.idCorazon;
    this.corazones.update((c) => [...c, { id, x: 35 + Math.random() * 30 }]);
    setTimeout(() => this.corazones.update((c) => c.filter((x) => x.id !== id)), 1600);
  }

  private reiniciarTemporizador(): void {
    this.pararTemporizador();
    if (!this.reproduciendo()) return;
    this.temporizador = setInterval(() => this.mover(1), SEGUNDOS_POR_IMAGEN * 1000);
  }

  private pararTemporizador(): void {
    if (this.temporizador) clearInterval(this.temporizador);
    this.temporizador = null;
  }

  // Las favoritas se recuerdan en este navegador, por usuario.
  private clave(): string {
    return `gestoweb.favoritas.${this.sesion.usuario()?.id ?? 'anonimo'}`;
  }

  private leerFavoritas(): Set<number> {
    try {
      return new Set(JSON.parse(localStorage.getItem(this.clave()) ?? '[]') as number[]);
    } catch {
      return new Set();
    }
  }

  private guardarFavoritas(): void {
    try {
      localStorage.setItem(this.clave(), JSON.stringify([...this.favoritas()]));
    } catch {
      /* sin almacenamiento */
    }
  }
}
