/**
 * Pruebas del dominio: reglas puras, sin base de datos ni HTTP.
 */
import { Accion } from '../src/dominio/accion/Accion';
import { resolverAccionEfectiva } from '../src/dominio/accion/Asignacion';
import { ErrorConflicto, ErrorValidacion } from '../src/dominio/compartido/errores';
import { ReglasDeteccion } from '../src/dominio/deteccion/Deteccion';
import { resumirEstadisticas, validarZonaHoraria } from '../src/dominio/deteccion/Estadisticas';
import { SesionReconocimiento } from '../src/dominio/deteccion/SesionReconocimiento';
import { Gesto } from '../src/dominio/gesto/Gesto';
import { Usuario } from '../src/dominio/usuario/Usuario';

const gesto = (cambios: Partial<Parameters<typeof Gesto.reconstruir>[0]> = {}) =>
  Gesto.reconstruir({
    id: 5, codigo: 'Thumb_Up', nombre: 'Pulgar arriba', descripcion: null,
    umbralConfianza: 0.7, idAccionPredeterminada: 5, activo: true, ...cambios,
  });
const accion = (id: number, activa = true, codigo = `A${id}`) =>
  Accion.reconstruir({ id, codigo, nombre: codigo, descripcion: null, activa });
const sesion = (cambios: Partial<Parameters<typeof SesionReconocimiento.reconstruir>[0]> = {}) =>
  SesionReconocimiento.reconstruir({
    id: 1, idUsuario: 10, fechaInicio: new Date('2026-10-09T15:00:00Z'), fechaFin: null,
    navegador: null, totalDetecciones: 0, ...cambios,
  });

describe('Usuario', () => {
  it('normaliza el correo a minúsculas y valida su formato', () => {
    expect(Usuario.normalizarCorreo('  Ana@Correo.COM ')).toBe('ana@correo.com');
    expect(() => Usuario.normalizarCorreo('sin-arroba')).toThrow(ErrorValidacion);
  });

  it('exige contraseñas de 8 a 72 caracteres con letras y números', () => {
    expect(() => Usuario.validarContrasena('corta1')).toThrow('al menos 8');
    expect(() => Usuario.validarContrasena('soloLetras')).toThrow('letra y un número');
    expect(() => Usuario.validarContrasena('a1'.repeat(40))).toThrow('72');
    expect(Usuario.validarContrasena('Segura123')).toBe('Segura123');
  });

  it('nunca expone el hash de la contraseña', () => {
    const u = Usuario.reconstruir({
      id: 1, nombre: 'Ana', correo: 'ana@x.com', contrasenaHash: 'HASH', rol: 'USUARIO',
      activo: true, fechaRegistro: new Date(), ultimoAcceso: null,
    });
    expect(JSON.stringify(u.aPublico())).not.toContain('HASH');
  });
});

describe('Gesto', () => {
  it('acepta una confianza igual o mayor al umbral', () => {
    expect(gesto().aceptaConfianza(0.7)).toBe(true);
    expect(gesto().aceptaConfianza(0.69)).toBe(false);
  });

  it('valida que el umbral esté entre 0 y 1 y lo redondea a 2 decimales', () => {
    expect(Gesto.validarUmbral(0.856)).toBe(0.86);
    expect(() => Gesto.validarUmbral(1.5)).toThrow(ErrorValidacion);
    expect(() => Gesto.validarUmbral('abc')).toThrow(ErrorValidacion);
  });
});

describe('Accion', () => {
  it('convierte el código a mayúsculas y rechaza caracteres raros', () => {
    expect(Accion.validarCodigo('subir_volumen')).toBe('SUBIR_VOLUMEN');
    expect(() => Accion.validarCodigo('con espacios')).toThrow(ErrorValidacion);
  });
});

describe('resolverAccionEfectiva', () => {
  const acciones = new Map([[5, accion(5)], [7, accion(7)], [9, accion(9, false)]]);
  const asignar = (idAccion: number) => ({ idUsuario: 1, idGesto: 5, idAccion, fechaActualizacion: new Date() });

  it('usa la acción que eligió el usuario', () => {
    expect(resolverAccionEfectiva(gesto(), asignar(7), acciones)).toMatchObject({ accion: { id: 7 }, esPredeterminada: false });
  });

  it('vuelve a la predeterminada si no hay asignación o la elegida está inactiva', () => {
    expect(resolverAccionEfectiva(gesto(), undefined, acciones).accion?.id).toBe(5);
    expect(resolverAccionEfectiva(gesto(), asignar(9), acciones).accion?.id).toBe(5);
  });

  it('devuelve ninguna acción si tampoco la predeterminada está activa', () => {
    const sinActivas = new Map([[5, accion(5, false)]]);
    expect(resolverAccionEfectiva(gesto(), undefined, sinActivas).accion).toBeNull();
  });
});

describe('SesionReconocimiento y ReglasDeteccion', () => {
  const ahora = new Date('2026-10-09T15:10:00Z');
  const datos = { idUsuario: 10, gesto: gesto(), idAccion: 5, confianza: 0.9, mano: 'Derecha', ahora };

  it('crea una detección válida', () => {
    const d = ReglasDeteccion.crear({ ...datos, sesion: sesion() });
    expect(d).toMatchObject({ idSesion: 1, idGesto: 5, confianza: 0.9, mano: 'Derecha', fechaHora: ahora });
  });

  it('rechaza detecciones en una sesión cerrada (como el trigger de la base)', () => {
    const cerrada = sesion({ fechaFin: new Date('2026-10-09T15:05:00Z') });
    expect(() => ReglasDeteccion.crear({ ...datos, sesion: cerrada })).toThrow(ErrorConflicto);
  });

  it('rechaza confianza bajo el umbral, mano inválida y gestos inactivos', () => {
    expect(() => ReglasDeteccion.crear({ ...datos, sesion: sesion(), confianza: 0.5 })).toThrow('no alcanza');
    expect(() => ReglasDeteccion.crear({ ...datos, sesion: sesion(), mano: 'Centro' })).toThrow('Izquierda o Derecha');
    expect(() => ReglasDeteccion.crear({ ...datos, sesion: sesion(), gesto: gesto({ activo: false }) })).toThrow(ErrorConflicto);
  });

  it('ajusta la hora del navegador para que no quede en el futuro ni antes de la sesión', () => {
    const s = sesion();
    expect(ReglasDeteccion.ajustarFecha('2030-01-01T00:00:00Z', s, ahora)).toEqual(ahora);
    expect(ReglasDeteccion.ajustarFecha('2020-01-01T00:00:00Z', s, ahora)).toEqual(s.fechaInicio);
    expect(ReglasDeteccion.ajustarFecha('2026-10-09T15:08:00Z', s, ahora)).toEqual(new Date('2026-10-09T15:08:00Z'));
  });

  it('una persona no puede usar la sesión de otra', () => {
    expect(() => sesion().asegurarDueno(99)).toThrow('no existe');
  });
});

describe('resumirEstadisticas', () => {
  it('calcula total, gesto más usado y confianza promedio ponderada', () => {
    const r = resumirEstadisticas(
      [
        { idGesto: 1, codigo: 'A', nombre: 'A', total: 3, confianzaPromedio: 0.8 },
        { idGesto: 2, codigo: 'B', nombre: 'B', total: 1, confianzaPromedio: 1 },
        { idGesto: 3, codigo: 'C', nombre: 'C', total: 0, confianzaPromedio: 0 },
      ],
      [{ dia: '2026-10-09', total: 3 }, { dia: '2026-10-08', total: 1 }],
    );
    expect(r.totalDetecciones).toBe(4);
    expect(r.gestoMasUsado?.codigo).toBe('A');
    expect(r.confianzaPromedio).toBe(0.85);
    expect(r.usoPorDia.map((d) => d.dia)).toEqual(['2026-10-08', '2026-10-09']);
  });

  it('sin datos no hay gesto más usado', () => {
    expect(resumirEstadisticas([], [])).toMatchObject({ totalDetecciones: 0, gestoMasUsado: null, confianzaPromedio: 0 });
  });

  it('valida la zona horaria', () => {
    expect(validarZonaHoraria('America/Guayaquil')).toBe('America/Guayaquil');
    expect(() => validarZonaHoraria('Marte/Base')).toThrow(ErrorValidacion);
  });
});
