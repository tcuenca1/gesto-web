import { ErrorNoAutenticado } from '../../../dominio/compartido/errores';
import { Usuario } from '../../../dominio/usuario/Usuario';
import { EntradaInicioSesion, IniciarSesionPuerto, ResultadoInicioSesion } from '../../puertos/entrada/usuarios';
import { CifradorContrasenas, GeneradorTokens, Reloj } from '../../puertos/salida/servicios';
import { UsuarioRepositorio } from '../../puertos/salida/UsuarioRepositorio';

const MENSAJE_CREDENCIALES = 'Correo o contraseña incorrectos';

/**
 * Hash de relleno: si el correo no existe igual comparamos contra algo,
 * para que la respuesta tarde lo mismo y no revele qué correos existen.
 */
const HASH_DE_RELLENO = '$2b$10$1PUm.xNMrV98XZSzpT1ngeTv3ql14vWBIp.xahgOdZsB7SesB6JyC';

/** RF-02 · Iniciar sesión con correo y contraseña y recibir un token. */
export class IniciarSesion implements IniciarSesionPuerto {
  constructor(
    private readonly usuarios: UsuarioRepositorio,
    private readonly cifrador: CifradorContrasenas,
    private readonly tokens: GeneradorTokens,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(entrada: EntradaInicioSesion): Promise<ResultadoInicioSesion> {
    if (typeof entrada.contrasena !== 'string' || entrada.contrasena === '') {
      throw new ErrorNoAutenticado(MENSAJE_CREDENCIALES);
    }
    let correo: string;
    try {
      correo = Usuario.normalizarCorreo(entrada.correo);
    } catch {
      throw new ErrorNoAutenticado(MENSAJE_CREDENCIALES);
    }

    const usuario = await this.usuarios.buscarPorCorreo(correo);
    const coincide = await this.cifrador.comparar(entrada.contrasena, usuario?.contrasenaHash ?? HASH_DE_RELLENO);
    if (!usuario || !coincide) throw new ErrorNoAutenticado(MENSAJE_CREDENCIALES);
    if (!usuario.puedeIniciarSesion()) {
      throw new ErrorNoAutenticado('Tu cuenta está desactivada. Habla con un administrador.');
    }

    usuario.registrarAcceso(this.reloj.ahora());
    await this.usuarios.actualizar(usuario);

    const { token, expiraEn } = this.tokens.generar({ idUsuario: usuario.id, rol: usuario.rol });
    return { token, expiraEn, usuario: usuario.aPublico() };
  }
}
