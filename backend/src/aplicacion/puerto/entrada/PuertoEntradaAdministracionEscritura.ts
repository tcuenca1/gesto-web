import { UsuarioPublico } from '../../../dominio/usuario/Usuario';
import { DtoAccion, DtoGesto } from '../../dto/DtoAccion';
import { DtoConAdministrador, DtoEditarGesto, DtoGestionarUsuario, DtoOperacionAccion } from '../../dto/DtoAdministracion';

/** Cambios del administrador; cada uno queda en la bitácora (RF-22). */
export abstract class PuertoEntradaAdministracionEscritura {
  /** RF-18 */
  abstract editarGesto(dto: DtoEditarGesto): Promise<DtoGesto>;
  /** RF-19: crear, editar o desactivar una acción */
  abstract gestionarAccion(dto: DtoOperacionAccion & DtoConAdministrador): Promise<DtoAccion>;
  /** RF-20: cambiar rol o estado */
  abstract gestionarUsuario(dto: DtoGestionarUsuario): Promise<UsuarioPublico>;
}
