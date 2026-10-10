import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Avisos } from '../../compartido/servicios/avisos';
import { Accion } from '../../nucleo/dominio/modelos';
import { ApiAdministracion, ApiGestoWeb } from '../../nucleo/puertos/api-gestoweb';

/** RF-19 · Gestionar el catálogo de acciones. */
@Component({
  selector: 'app-admin-acciones',
  imports: [FormsModule],
  template: `
    <form class="panel formulario-linea" (ngSubmit)="crear()">
      <div class="campo">
        <label for="codigo">Código</label>
        <input id="codigo" name="codigo" [(ngModel)]="nueva.codigo" placeholder="SUBIR_VOLUMEN" maxlength="30" required />
      </div>
      <div class="campo">
        <label for="nombre">Nombre visible</label>
        <input id="nombre" name="nombre" [(ngModel)]="nueva.nombre" placeholder="Subir volumen" maxlength="60" required />
      </div>
      <div class="campo">
        <label for="descripcion">Descripción</label>
        <input id="descripcion" name="descripcion" [(ngModel)]="nueva.descripcion" maxlength="200" />
      </div>
      <button class="boton" type="submit" [disabled]="!nueva.codigo || !nueva.nombre">Agregar acción</button>
    </form>
    <p class="texto-suave">
      El panel de demostración solo sabe ejecutar las 8 acciones iniciales. Una acción nueva se puede asignar y queda en el historial,
      pero en el panel solo muestra un aviso hasta que alguien programe su efecto. Desactivar una acción no borra el historial.
    </p>

    <div class="panel tabla-contenedor">
      <table>
        <thead><tr><th>Código</th><th>Nombre</th><th>Descripción</th><th>Estado</th><th><span class="oculto-visual">Acciones</span></th></tr></thead>
        <tbody>
          @for (a of acciones(); track a.id) {
            <tr>
              <td><code>{{ a.codigo }}</code></td>
              <td><input [name]="'n' + a.id" [(ngModel)]="a.nombre" maxlength="60" [attr.aria-label]="'Nombre de ' + a.codigo" /></td>
              <td><input [name]="'d' + a.id" [(ngModel)]="a.descripcion" maxlength="200" [attr.aria-label]="'Descripción de ' + a.codigo" /></td>
              <td>
                <span class="etiqueta" [class.etiqueta--apagada]="!a.activa">{{ a.activa ? 'Activa' : 'Desactivada' }}</span>
              </td>
              <td class="acciones-fila">
                <button class="boton boton--chico" type="button" (click)="guardar(a)">Guardar</button>
                @if (a.activa) {
                  <button class="boton boton--chico boton--fantasma" type="button" (click)="desactivar(a)">Desactivar</button>
                } @else {
                  <button class="boton boton--chico boton--fantasma" type="button" (click)="activar(a)">Activar</button>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styleUrl: './admin.scss',
})
export class AdminAcciones implements OnInit {
  private readonly api: ApiAdministracion = inject(ApiGestoWeb);
  private readonly avisos = inject(Avisos);
  protected readonly acciones = signal<Accion[]>([]);
  protected nueva = { codigo: '', nombre: '', descripcion: '' };

  async ngOnInit(): Promise<void> {
    await this.recargar();
  }

  protected async crear(): Promise<void> {
    try {
      const a = await this.api.crearAccion({ ...this.nueva, descripcion: this.nueva.descripcion || undefined });
      this.nueva = { codigo: '', nombre: '', descripcion: '' };
      this.avisos.exito(`Acción ${a.codigo} creada.`);
      await this.recargar();
    } catch (e) {
      this.avisos.error(e);
    }
  }

  protected async guardar(a: Accion): Promise<void> {
    await this.ejecutar(() => this.api.editarAccion(a.id, { nombre: a.nombre, descripcion: a.descripcion }), 'Cambios guardados.');
  }

  protected async desactivar(a: Accion): Promise<void> {
    if (!confirm(`¿Desactivar la acción "${a.nombre}"? Los usuarios que la usaban volverán a la acción inicial del gesto.`)) return;
    await this.ejecutar(() => this.api.desactivarAccion(a.id), 'Acción desactivada.');
  }

  protected async activar(a: Accion): Promise<void> {
    await this.ejecutar(() => this.api.editarAccion(a.id, { activa: true }), 'Acción activada.');
  }

  private async ejecutar(operacion: () => Promise<Accion>, mensaje: string): Promise<void> {
    try {
      await operacion();
      this.avisos.exito(mensaje);
    } catch (e) {
      this.avisos.error(e);
    }
    await this.recargar();
  }

  private async recargar(): Promise<void> {
    try {
      this.acciones.set(await this.api.accionesAdmin());
    } catch (e) {
      this.avisos.error(e);
    }
  }
}
