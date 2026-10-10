/**
 * Pruebas de los casos de uso del núcleo (RNF-14: al menos una por caso de uso).
 * Usan los adaptadores en memoria: no hace falta PostgreSQL ni Express.
 */
import { ErrorConflicto, ErrorNoAutenticado, ErrorNoEncontrado, ErrorValidacion } from '../src/dominio/compartido/errores';
import { ADMIN, entornoMemoria, registrar } from './ayudantes';

describe('Casos de uso · Usuarios', () => {
  it('RegistrarUsuario crea la cuenta con rol USUARIO y contraseña cifrada', async () => {
    const { casos, almacen } = entornoMemoria();
    const u = await casos.usuarios.registrar.ejecutar({ nombre: ' Ana  Pérez ', correo: 'ANA@correo.com', contrasena: 'Clave1234' });
    expect(u).toMatchObject({ nombre: 'Ana Pérez', correo: 'ana@correo.com', rol: 'USUARIO', activo: true });
    const guardado = almacen.estado.usuarios.find((x) => x.id === u.id)!;
    expect(guardado.contrasenaHash).toMatch(/^\$2[aby]\$/);
    expect(guardado.contrasenaHash).not.toContain('Clave1234');
  });

  it('RegistrarUsuario rechaza un correo repetido', async () => {
    const { casos } = entornoMemoria();
    await registrar(casos, 'ana@correo.com');
    await expect(registrar(casos, 'Ana@Correo.com')).rejects.toThrow(ErrorConflicto);
  });

  it('IniciarSesion devuelve un token que AutenticarSolicitud acepta', async () => {
    const { casos } = entornoMemoria();
    const { token, usuario, expiraEn } = await casos.usuarios.iniciarSesion.ejecutar(ADMIN);
    expect(usuario.rol).toBe('ADMIN');
    expect(usuario.ultimoAcceso).not.toBeNull();
    expect(expiraEn.getTime() - Date.now()).toBeGreaterThan(7.9 * 3600 * 1000);
    expect((await casos.usuarios.autenticar.ejecutar({ token })).id).toBe(usuario.id);
  });

  it('IniciarSesion da el mismo mensaje si el correo no existe o la contraseña está mal', async () => {
    const { casos } = entornoMemoria();
    await expect(casos.usuarios.iniciarSesion.ejecutar({ correo: 'nadie@x.com', contrasena: 'Clave1234' }))
      .rejects.toThrow('Correo o contraseña incorrectos');
    await expect(casos.usuarios.iniciarSesion.ejecutar({ correo: ADMIN.correo, contrasena: 'Mala1234' }))
      .rejects.toThrow('Correo o contraseña incorrectos');
  });

  it('AutenticarSolicitud rechaza tokens falsos y usuarios desactivados', async () => {
    const { casos, almacen } = entornoMemoria();
    await expect(casos.usuarios.autenticar.ejecutar({ token: 'abc' })).rejects.toThrow(ErrorNoAutenticado);
    const id = await registrar(casos);
    const { token } = await casos.usuarios.iniciarSesion.ejecutar({ correo: 'ana@correo.com', contrasena: 'Clave1234' });
    almacen.estado.usuarios.find((u) => u.id === id)!.activo = false;
    await expect(casos.usuarios.autenticar.ejecutar({ token })).rejects.toThrow(ErrorNoAutenticado);
  });

  it('EditarPerfil cambia el nombre y la contraseña solo si la actual es correcta', async () => {
    const { casos } = entornoMemoria();
    const id = await registrar(casos);
    await expect(casos.usuarios.editarPerfil.ejecutar({ idUsuario: id, contrasenaActual: 'Mala1234', contrasenaNueva: 'Nueva1234' }))
      .rejects.toThrow('contraseña actual');
    const u = await casos.usuarios.editarPerfil.ejecutar({ idUsuario: id, nombre: 'Ana María', contrasenaActual: 'Clave1234', contrasenaNueva: 'Nueva1234' });
    expect(u.nombre).toBe('Ana María');
    await expect(casos.usuarios.iniciarSesion.ejecutar({ correo: 'ana@correo.com', contrasena: 'Nueva1234' })).resolves.toBeDefined();
  });

  it('ObtenerPerfil devuelve los datos públicos', async () => {
    const { casos } = entornoMemoria();
    const perfil = await casos.usuarios.obtenerPerfil.ejecutar({ idUsuario: 1 });
    expect(perfil.correo).toBe(ADMIN.correo);
    expect(perfil).not.toHaveProperty('contrasenaHash');
  });
});

describe('Casos de uso · Reconocimiento (CU-03)', () => {
  it('flujo completo: abrir sesión, registrar detección y cerrar', async () => {
    const { casos, reloj } = entornoMemoria();
    const id = await registrar(casos);
    const sesion = await casos.reconocimiento.abrirSesion.ejecutar({ idUsuario: id, navegador: 'Chrome' });
    expect(sesion.fechaFin).toBeNull();

    reloj.avanzar(2000);
    const d = await casos.reconocimiento.registrarDeteccion.ejecutar({
      idUsuario: id, idSesion: sesion.id, codigoGesto: 'Pointing_Up', confianza: 0.93, mano: 'Derecha',
    });
    expect(d).toMatchObject({ codigoGesto: 'Pointing_Up', codigoAccion: 'SIGUIENTE', confianza: 0.93 });

    reloj.avanzar(1000);
    const cerrada = await casos.reconocimiento.cerrarSesion.ejecutar({ idUsuario: id, idSesion: sesion.id });
    expect(cerrada.fechaFin).toEqual(reloj.ahora());
    expect(cerrada.totalDetecciones).toBe(1);
  });

  it('RegistrarDeteccion rechaza una sesión cerrada (P-07 en el núcleo)', async () => {
    const { casos } = entornoMemoria();
    const id = await registrar(casos);
    const s = await casos.reconocimiento.abrirSesion.ejecutar({ idUsuario: id });
    await casos.reconocimiento.cerrarSesion.ejecutar({ idUsuario: id, idSesion: s.id });
    await expect(casos.reconocimiento.registrarDeteccion.ejecutar({
      idUsuario: id, idSesion: s.id, codigoGesto: 'Victory', confianza: 0.9, mano: 'Izquierda',
    })).rejects.toThrow(ErrorConflicto);
  });

  it('RegistrarDeteccion no deja usar la sesión de otro usuario', async () => {
    const { casos } = entornoMemoria();
    const ana = await registrar(casos, 'ana@x.com');
    const luis = await registrar(casos, 'luis@x.com');
    const s = await casos.reconocimiento.abrirSesion.ejecutar({ idUsuario: ana });
    await expect(casos.reconocimiento.registrarDeteccion.ejecutar({
      idUsuario: luis, idSesion: s.id, codigoGesto: 'Victory', confianza: 0.9, mano: 'Derecha',
    })).rejects.toThrow(ErrorNoEncontrado);
  });

  it('RegistrarDeteccion usa la acción personalizada del usuario', async () => {
    const { casos } = entornoMemoria();
    const id = await registrar(casos);
    await casos.acciones.cambiarAsignacion.ejecutar({ idUsuario: id, idGesto: 3, idAccion: 7 }); // índice arriba → corazón
    const s = await casos.reconocimiento.abrirSesion.ejecutar({ idUsuario: id });
    const d = await casos.reconocimiento.registrarDeteccion.ejecutar({
      idUsuario: id, idSesion: s.id, codigoGesto: 'Pointing_Up', confianza: 0.8, mano: 'Derecha',
    });
    expect(d.codigoAccion).toBe('CORAZON');
  });

  it('AbrirSesionReconocimiento cierra la sesión que quedó abierta (flujo 9a)', async () => {
    const { casos, almacen, reloj } = entornoMemoria();
    const id = await registrar(casos);
    const primera = await casos.reconocimiento.abrirSesion.ejecutar({ idUsuario: id });
    reloj.avanzar(5000);
    await casos.reconocimiento.registrarDeteccion.ejecutar({
      idUsuario: id, idSesion: primera.id, codigoGesto: 'Thumb_Up', confianza: 0.9, mano: 'Derecha',
    });
    reloj.avanzar(60 * 60 * 1000); // el usuario cerró la pestaña y volvió una hora después
    await casos.reconocimiento.abrirSesion.ejecutar({ idUsuario: id });
    const vieja = almacen.estado.sesiones.find((s) => s.id === primera.id)!;
    expect(vieja.fechaFin).toEqual(new Date(primera.fechaInicio.getTime() + 5000)); // hora de su última detección
  });
});

describe('Casos de uso · Acciones', () => {
  it('ListarGestos y ListarAcciones devuelven solo lo activo por defecto', async () => {
    const { casos, almacen } = entornoMemoria();
    almacen.estado.gestos[6].activo = false;
    expect(await casos.acciones.listarGestos.ejecutar({})).toHaveLength(6);
    expect(await casos.acciones.listarGestos.ejecutar({ incluirInactivos: true })).toHaveLength(7);
    expect(await casos.acciones.listarAcciones.ejecutar({})).toHaveLength(8);
  });

  it('ObtenerAsignaciones devuelve la configuración inicial de la SRS', async () => {
    const { casos } = entornoMemoria();
    const id = await registrar(casos);
    const mapa = Object.fromEntries((await casos.acciones.obtenerAsignaciones.ejecutar({ idUsuario: id }))
      .map((a) => [a.gesto.codigo, a.accion?.codigo]));
    expect(mapa).toEqual({
      Open_Palm: 'REPRODUCIR_PAUSAR', Closed_Fist: 'DETENER', Pointing_Up: 'SIGUIENTE', Victory: 'ANTERIOR',
      Thumb_Up: 'MARCAR_FAVORITA', Thumb_Down: 'QUITAR_FAVORITA', ILoveYou: 'CORAZON',
    });
  });

  it('CambiarAsignacion valida la acción y RestaurarAsignaciones vuelve al inicio', async () => {
    const { casos } = entornoMemoria();
    const id = await registrar(casos);
    await expect(casos.acciones.cambiarAsignacion.ejecutar({ idUsuario: id, idGesto: 1, idAccion: 999 })).rejects.toThrow(ErrorValidacion);
    const cambio = await casos.acciones.cambiarAsignacion.ejecutar({ idUsuario: id, idGesto: 1, idAccion: '8' });
    expect(cambio).toMatchObject({ accion: { codigo: 'NINGUNA' }, esPredeterminada: false });
    const restaurado = await casos.acciones.restaurarAsignaciones.ejecutar({ idUsuario: id });
    expect(restaurado.every((a) => a.esPredeterminada)).toBe(true);
  });
});

describe('Casos de uso · Historial y estadísticas', () => {
  async function conDetecciones() {
    const entorno = entornoMemoria();
    const { casos, reloj } = entorno;
    const id = await registrar(casos);
    const s = await casos.reconocimiento.abrirSesion.ejecutar({ idUsuario: id });
    const gestos = ['Thumb_Up', 'Thumb_Up', 'Victory'];
    for (const [i, codigoGesto] of gestos.entries()) {
      reloj.avanzar(1000);
      await casos.reconocimiento.registrarDeteccion.ejecutar({
        idUsuario: id, idSesion: s.id, codigoGesto, confianza: 0.8 + i * 0.05, mano: 'Derecha',
      });
    }
    return { ...entorno, id };
  }

  it('ConsultarHistorial filtra por gesto y pagina del más reciente al más antiguo', async () => {
    const { casos, id } = await conDetecciones();
    const todo = await casos.historial.consultar.ejecutar({ idUsuario: id, limite: '2' });
    expect(todo).toMatchObject({ total: 3, pagina: 1, limite: 2 });
    expect(todo.elementos[0].codigoGesto).toBe('Victory');
    const filtrado = await casos.historial.consultar.ejecutar({ idUsuario: id, gesto: 'Thumb_Up' });
    expect(filtrado.total).toBe(2);
    await expect(casos.historial.consultar.ejecutar({ idUsuario: id, gesto: 'Saludo' })).rejects.toThrow(ErrorValidacion);
  });

  it('ConsultarEstadisticas calcula gesto más usado y uso por día en hora de Ecuador', async () => {
    const { casos, id } = await conDetecciones();
    const e = await casos.historial.estadisticas.ejecutar({ idUsuario: id });
    expect(e.totalDetecciones).toBe(3);
    expect(e.gestoMasUsado?.codigo).toBe('Thumb_Up');
    expect(e.confianzaPromedio).toBeCloseTo(0.85, 3);
    expect(e.usoPorDia).toEqual([{ dia: '2026-10-09', total: 3 }]);
  });

  it('ExportarHistorial genera un CSV con encabezados y una fila por detección', async () => {
    const { casos, id } = await conDetecciones();
    const csv = await casos.historial.exportar.ejecutar({ idUsuario: id });
    const lineas = csv.contenido.trim().split('\r\n');
    expect(csv.nombreArchivo).toBe('historial-gestoweb-2026-10-09.csv');
    expect(lineas[0]).toContain('fecha_local');
    expect(lineas).toHaveLength(4);
    expect(lineas[1]).toContain('Victoria');
  });

  it('el historial de un usuario no incluye detecciones de otro', async () => {
    const { casos } = await conDetecciones();
    const otro = await registrar(casos, 'otro@x.com');
    expect((await casos.historial.consultar.ejecutar({ idUsuario: otro })).total).toBe(0);
  });
});

describe('Casos de uso · Administración', () => {
  it('EditarGesto cambia el umbral y lo registra en la bitácora', async () => {
    const { casos, almacen } = entornoMemoria();
    const g = await casos.administracion.editarGesto.ejecutar({ idAdministrador: 1, idGesto: 4, cambios: { umbralConfianza: 0.85 } });
    expect(g.umbralConfianza).toBe(0.85);
    expect(almacen.estado.bitacora).toHaveLength(1);
    expect(almacen.estado.bitacora[0]).toMatchObject({ tablaAfectada: 'gestos', operacion: 'UPDATE' });
  });

  it('si el cambio es inválido no se guarda nada (ni el cambio ni la bitácora)', async () => {
    const { casos, almacen } = entornoMemoria();
    await expect(casos.administracion.editarGesto.ejecutar({
      idAdministrador: 1, idGesto: 4, cambios: { nombre: 'Nuevo', umbralConfianza: 2 },
    })).rejects.toThrow(ErrorValidacion);
    expect(almacen.estado.gestos[3].nombre).toBe('Victoria');
    expect(almacen.estado.bitacora).toHaveLength(0);
  });

  it('GestionarAcciones crea, edita y desactiva acciones con sus reglas', async () => {
    const { casos } = entornoMemoria();
    const nueva = await casos.administracion.gestionarAcciones.ejecutar({
      tipo: 'crear', idAdministrador: 1, datos: { codigo: 'zoom', nombre: 'Acercar' },
    });
    expect(nueva.codigo).toBe('ZOOM');
    const editada = await casos.administracion.gestionarAcciones.ejecutar({
      tipo: 'editar', idAdministrador: 1, idAccion: nueva.id, datos: { nombre: 'Acercar imagen' },
    });
    expect(editada.nombre).toBe('Acercar imagen');
    const borrada = await casos.administracion.gestionarAcciones.ejecutar({ tipo: 'desactivar', idAdministrador: 1, idAccion: nueva.id });
    expect(borrada.activa).toBe(false);
    await expect(casos.administracion.gestionarAcciones.ejecutar({ tipo: 'desactivar', idAdministrador: 1, idAccion: 3 }))
      .rejects.toThrow('predeterminada');
  });

  it('ListarUsuarios y GestionarUsuarios: cambia roles, pero nadie se quita su propio rol', async () => {
    const { casos } = entornoMemoria();
    const id = await registrar(casos);
    expect(await casos.administracion.listarUsuarios.ejecutar({})).toHaveLength(2);
    const u = await casos.administracion.gestionarUsuarios.ejecutar({ idAdministrador: 1, idUsuario: id, cambios: { rol: 'ADMIN', activo: false } });
    expect(u).toMatchObject({ rol: 'ADMIN', activo: false });
    await expect(casos.administracion.gestionarUsuarios.ejecutar({ idAdministrador: 1, idUsuario: 1, cambios: { rol: 'USUARIO' } }))
      .rejects.toThrow(ErrorConflicto);
  });

  it('ConsultarEstadisticasGenerales y ConsultarBitacora', async () => {
    const { casos } = entornoMemoria();
    const id = await registrar(casos);
    const s = await casos.reconocimiento.abrirSesion.ejecutar({ idUsuario: id });
    await casos.reconocimiento.registrarDeteccion.ejecutar({ idUsuario: id, idSesion: s.id, codigoGesto: 'ILoveYou', confianza: 0.99, mano: 'Izquierda' });
    const e = await casos.administracion.estadisticasGenerales.ejecutar({});
    expect(e).toMatchObject({ totalUsuarios: 2, totalSesiones: 1, totalDetecciones: 1 });
    expect(e.usoPorGesto.find((g) => g.codigo === 'ILoveYou')).toMatchObject({ total: 1, usuariosDistintos: 1 });

    await casos.administracion.editarGesto.ejecutar({ idAdministrador: 1, idGesto: 1, cambios: { activo: false } });
    const b = await casos.administracion.consultarBitacora.ejecutar({});
    expect(b.elementos[0]).toMatchObject({ nombreUsuario: 'Administrador', tablaAfectada: 'gestos' });
  });
});
