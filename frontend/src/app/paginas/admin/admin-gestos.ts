import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Avisos } from '../../compartido/servicios/avisos';
import { infoGesto } from '../../nucleo/dominio/gesto';
import { Accion, Gesto } from '../../nucleo/dominio/modelos';
import { ApiAdministracion, ApiGestoWeb } from '../../nucleo/puertos/api-gestoweb';

interface FilaGesto extends Gesto {
  cambiado: boolean;
}

/** RF-18 · Activar o desactivar gestos y editar su nombre, descripción y confianza mínima. */
@Component({
  selector: 'app-admin-gestos',
  imports: [FormsModule],
  template: `
    <p class="texto-suave">
      Un gesto desactivado se ignora al reconocer. La confianza mínima decide qué tan seguro debe estar el modelo para aceptarlo (por defecto 70 %).
    </p>
    <div class="lista">
      @for (g of filas(); track g.id) {
        <form class="panel gesto" [class.gesto--inactivo]="!g.activo" (ngSubmit)="guardar(g)">
          <span class="gesto__icono" aria-hidden="true">{{ icono(g.codigo) }}</span>
          <div class="gesto__campos">
            <div class="campo">
              <label [for]="'n' + g.id">Nombre</label>
              <input [id]="'n' + g.id" [name]="'n' + g.id" [(ngModel)]="g.nombre" (ngModelChange)="g.cambiado = true" maxlength="50" required />
            </div>
            <div class="campo">
              <label [for]="'d' + g.id">Cómo se hace</label>
              <input [id]="'d' + g.id" [name]="'d' + g.id" [(ngModel)]="g.descripcion" (ngModelChange)="g.cambiado = true" maxlength="200" />
            </div>
            <div class="campo">
              <label [for]="'u' + g.id">Confianza mínima: {{ redondear(g.umbralConfianza * 100) }} %</label>
              <input [id]="'u' + g.id" [name]="'u' + g.id" type="range" min="0.3" max="0.99" step="0.01" [(ngModel)]="g.umbralConfianza" (ngModelChange)="g.cambiado = true" />
            </div>
          </div>
          <div class="gesto__lateral">
            <code>{{ g.codigo }}</code>
            <label class="interruptor">
              <input type="checkbox" [name]="'a' + g.id" [(ngModel)]="g.activo" (ngModelChange)="g.cambiado = true" />
              {{ g.activo ? 'Activo' : 'Desactivado' }}
            </label>
            <span class="texto-suave">Acción inicial: {{ nombreAccion(g.idAccionPredeterminada) }}</span>
            <button class="boton boton--chico" type="submit" [disabled]="!g.cambiado">Guardar</button>
          </div>
        </form>
      }
    </div>
  `,
  styleUrl: './admin.scss',
})
export class AdminGestos implements OnInit {
  private readonly api: ApiAdministracion = inject(ApiGestoWeb);
  private readonly avisos = inject(Avisos);
  protected readonly filas = signal<FilaGesto[]>([]);
  private acciones: Accion[] = [];
  protected readonly redondear = Math.round;

  async ngOnInit(): Promise<void> {
    try {
      const [gestos, acciones] = await Promise.all([this.api.gestosAdmin(), this.api.accionesAdmin()]);
      this.acciones = acciones;
      this.filas.set(gestos.map((g) => ({ ...g, cambiado: false })));
    } catch (e) {
      this.avisos.error(e);
    }
  }

  protected icono(codigo: string): string {
    return infoGesto(codigo)?.icono ?? '✋';
  }

  protected nombreAccion(id: number): string {
    return this.acciones.find((a) => a.id === id)?.nombre ?? '—';
  }

  protected async guardar(fila: FilaGesto): Promise<void> {
    try {
      const g = await this.api.editarGesto(fila.id, {
        nombre: fila.nombre,
        descripcion: fila.descripcion,
        umbralConfianza: Number(fila.umbralConfianza),
        activo: fila.activo,
      });
      this.filas.update((l) => l.map((x) => (x.id === g.id ? { ...g, cambiado: false } : x)));
      this.avisos.exito(`${g.nombre} guardado.`);
    } catch (e) {
      this.avisos.error(e);
    }
  }
}
