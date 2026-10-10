import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Avisos } from '../../compartido/servicios/avisos';
import { SesionUsuario } from '../../compartido/servicios/sesion-usuario';
import { fechaHora } from '../../compartido/utilidades';
import { Usuario } from '../../nucleo/dominio/modelos';
import { ApiAdministracion, ApiGestoWeb } from '../../nucleo/puertos/api-gestoweb';

/** RF-20 · Ver usuarios, cambiar su rol y activarlos o desactivarlos. */
@Component({
  selector: 'app-admin-usuarios',
  imports: [FormsModule],
  template: `
    <div class="formulario-linea">
      <div class="campo">
        <label for="buscar">Buscar por nombre o correo</label>
        <input id="buscar" type="search" [ngModel]="busqueda()" (ngModelChange)="busqueda.set($event)" />
      </div>
    </div>
    <div class="panel tabla-contenedor">
      <table>
        <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Último acceso</th></tr></thead>
        <tbody>
          @for (u of filtrados(); track u.id) {
            <tr>
              <td><strong>{{ u.nombre }}</strong> @if (u.id === miId()) { <span class="etiqueta">Tú</span> }</td>
              <td>{{ u.correo }}</td>
              <td>
                <select [value]="u.rol" (change)="cambiar(u, { rol: $any($event.target).value })" [disabled]="u.id === miId()" [attr.aria-label]="'Rol de ' + u.nombre">
                  <option value="USUARIO">Usuario</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </td>
              <td>
                <label class="interruptor">
                  <input type="checkbox" [checked]="u.activo" (change)="cambiar(u, { activo: $any($event.target).checked })" [disabled]="u.id === miId()" />
                  {{ u.activo ? 'Activo' : 'Inactivo' }}
                </label>
              </td>
              <td>{{ fecha(u.ultimoAcceso) }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    <p class="texto-suave">No puedes cambiar tu propio rol ni desactivar tu cuenta. Un usuario inactivo no puede iniciar sesión.</p>
  `,
  styleUrl: './admin.scss',
})
export class AdminUsuarios implements OnInit {
  private readonly api: ApiAdministracion = inject(ApiGestoWeb);
  private readonly avisos = inject(Avisos);
  private readonly sesion = inject(SesionUsuario);
  protected readonly miId = computed(() => this.sesion.usuario()?.id);
  protected readonly usuarios = signal<Usuario[]>([]);
  protected readonly busqueda = signal('');
  protected readonly fecha = fechaHora;
  protected readonly filtrados = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    return this.usuarios().filter((u) => !q || u.nombre.toLowerCase().includes(q) || u.correo.includes(q));
  });

  async ngOnInit(): Promise<void> {
    try {
      this.usuarios.set(await this.api.usuarios());
    } catch (e) {
      this.avisos.error(e);
    }
  }

  protected async cambiar(u: Usuario, cambios: { rol?: string; activo?: boolean }): Promise<void> {
    try {
      const actualizado = await this.api.cambiarUsuario(u.id, cambios);
      this.usuarios.update((l) => l.map((x) => (x.id === actualizado.id ? actualizado : x)));
      this.avisos.exito(`${actualizado.nombre}: ${actualizado.rol === 'ADMIN' ? 'administrador' : 'usuario'}, ${actualizado.activo ? 'activo' : 'inactivo'}.`);
    } catch (e) {
      this.avisos.error(e);
      this.usuarios.update((l) => [...l]);
    }
  }
}
