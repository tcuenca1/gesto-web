import { ErrorConflicto, ErrorNoAutenticado, ErrorNoEncontrado, ErrorValidacion } from '../../../dominio/compartido/errores';
import { Usuario, UsuarioPublico } from '../../../dominio/usuario/Usuario';
import { DtoEditarPerfil, DtoInicioSesion, DtoRegistroUsuario, DtoResultadoInicioSesion } from '../../dto/DtoUsuario';
import { usuarioARespuesta } from '../../dto/RespuestaUsuario';
import { PuertoEntradaUsuarioEscritura } from '../../puerto/entrada/PuertoEntradaUsuarioEscritura';
import { PuertoSalidaCifrador } from '../../puerto/salida/PuertoSalidaCifrador';
import { PuertoSalidaReloj } from '../../puerto/salida/PuertoSalidaReloj';
import { PuertoSalidaTokens } from '../../puerto/salida/PuertoSalidaTokens';
import { PuertoSalidaUsuario } from '../../puerto/salida/PuertoSalidaUsuario';

const MENSAJE_CREDENCIALES = 'Correo o contraseña incorrectos';

/**
 * Hash de relleno: si el correo no existe igual comparamos contra algo,
 * para que la respuesta tarde lo mismo y no revele qué correos existen.
 */
const HASH_DE_RELLENO = '$2b$10$1PUm.xNMrV98XZSzpT1ngeTv3ql14vWBIp.xahgOdZsB7SesB6JyC';

/** Cambios del módulo Usuario: registro, inicio de sesión y perfil. */
export class CasoUso_UsuarioEscritura extends PuertoEntradaUsuarioEscritura {
  constructor(
    private readonly usuarios: PuertoSalidaUsuario,
    private readonly cifrador: PuertoSalidaCifrador,
    private readonly tokens: PuertoSalidaTokens,
    private readonly reloj: PuertoSalidaReloj,
  ) {
    super();
  }

  /**
   * RF-01 · Un visitante crea su cuenta con nombre, correo y contraseña.
   * Toda cuenta nueva nace con el rol USUARIO.
   */
  async registrarUsuario(dto: DtoRegistroUsuario): Promise<UsuarioPublico> {
    const nombre = Usuario.validarNombre(dto.nombre);
    const correo = Usuario.normalizarCorreo(dto.correo);
    const contrasena = Usuario.validarContrasena(dto.contrasena);

    if (await this.usuarios.buscarPorCorreo(correo)) {
      throw new ErrorConflicto('Ya existe una cuenta con ese correo');
    }

    const contrasenaHash = await this.cifrador.cifrar(contrasena);
    const usuario = await this.usuarios.crear({ nombre, correo, contrasenaHash, rol: 'USUARIO' });
    return usuarioARespuesta(usuario);
  }

  /** RF-02 · Iniciar sesión con correo y contraseña y recibir un token. */
  async iniciarSesion(dto: DtoInicioSesion): Promise<DtoResultadoInicioSesion> {
    if (typeof dto.contrasena !== 'string' || dto.contrasena === '') {
      throw new ErrorNoAutenticado(MENSAJE_CREDENCIALES);
    }
    let correo: string;
    try {
      correo = Usuario.normalizarCorreo(dto.correo);
    } catch {
      throw new ErrorNoAutenticado(MENSAJE_CREDENCIALES);
    }

    const usuario = await this.usuarios.buscarPorCorreo(correo);
    const coincide = await this.cifrador.comparar(dto.contrasena, usuario?.contrasenaHash ?? HASH_DE_RELLENO);
    if (!usuario || !coincide) throw new ErrorNoAutenticado(MENSAJE_CREDENCIALES);
    if (!usuario.puedeIniciarSesion()) {
      throw new ErrorNoAutenticado('Tu cuenta está desactivada. Habla con un administrador.');
    }

    usuario.registrarAcceso(this.reloj.ahora());
    await this.usuarios.actualizar(usuario);

    const { token, expiraEn } = this.tokens.generar({ idUsuario: usuario.id, rol: usuario.rol });
    return { token, expiraEn, usuario: usuarioARespuesta(usuario) };
  }

  /** RF-05 · Editar el nombre y cambiar la contraseña (confirmando la actual). */
  async editarPerfil(dto: DtoEditarPerfil): Promise<UsuarioPublico> {
    const usuario = await this.usuarios.buscarPorId(dto.idUsuario);
    if (!usuario) throw new ErrorNoEncontrado('El usuario no existe');

    const cambiaNombre = dto.nombre !== undefined;
    const cambiaContrasena = dto.contrasenaNueva !== undefined && dto.contrasenaNueva !== '';
    if (!cambiaNombre && !cambiaContrasena) throw new ErrorValidacion('No hay cambios para guardar');

    if (cambiaNombre) usuario.cambiarNombre(dto.nombre);

    if (cambiaContrasena) {
      const nueva = Usuario.validarContrasena(dto.contrasenaNueva);
      const actual = typeof dto.contrasenaActual === 'string' ? dto.contrasenaActual : '';
      if (!(await this.cifrador.comparar(actual, usuario.contrasenaHash))) {
        throw new ErrorValidacion('La contraseña actual no es correcta');
      }
      usuario.cambiarContrasenaHash(await this.cifrador.cifrar(nueva));
    }

    await this.usuarios.actualizar(usuario);
    return usuarioARespuesta(usuario);
  }
}
