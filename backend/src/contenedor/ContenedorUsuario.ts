import { CasoUso_UsuarioEscritura } from '../aplicacion/caso_uso/escritura/CasoUso_UsuarioEscritura';
import { CasoUso_UsuarioLectura } from '../aplicacion/caso_uso/lectura/CasoUso_UsuarioLectura';
import { AdapEntrada_UsuarioWeb } from '../infraestructura/adaptadores/entrada/AdapEntrada_UsuarioWeb';
import { PuertosDeSalida } from './ContenedorPersistencia';

export function crearContenedorUsuario(p: PuertosDeSalida) {
  const cuLectura = new CasoUso_UsuarioLectura(p.usuarios, p.tokens);
  const cuEscritura = new CasoUso_UsuarioEscritura(p.usuarios, p.cifrador, p.tokens, p.reloj);
  const adap = new AdapEntrada_UsuarioWeb(cuLectura, cuEscritura);
  return { cuLectura, cuEscritura, adap };
}
