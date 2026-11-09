/**
 * Pruebas de los contenedores de uso del núcleo (RNF-14: al menos una por caso de uso).
 * Usan los adaptadores en memoria: no hace falta PostgreSQL ni Express.
 */
import { ErrorConflicto, ErrorNoAutenticado, ErrorNoEncontrado, ErrorValidacion } from '../src/dominio/compartido/errores';
import { ADMIN, entornoMemoria, registrar } from './ayudantes';

describe('Casos de uso · Usuarios', () => {
  it('RegistrarUsuario crea la cuenta con rol USUARIO y contraseña cifrada', async () => {
    const { contenedores, almacen } = entornoMemoria();
    const u = await contenedores.usuario.cuEscritura.registrarUsuario({ nombre: ' Ana  Pérez ', correo: 'ANA@correo.com', contrasena: 'Clave1234' });
    expect(u).toMatchObject({ nombre: 'Ana Pérez', correo: 'ana@correo.com', rol: 'USUARIO', activo: true });
    const guardado = almacen.estado.usuarios.find((x) => x.id === u.id)!;
    expect(guardado.contrasenaHash).toMatch(/^\$2[aby]\$/);
    expect(guardado.contrasenaHash).not.toContain('Clave1234');
  });

  it('RegistrarUsuario rechaza un correo repetido', async () => {
    const { contenedores } = entornoMemoria();
    await registrar(contenedores, 'ana@correo.com');
    await expect(registrar(contenedores, 'Ana@Correo.com')).rejects.toThrow(ErrorConflicto);
  });

  it('IniciarSesion devuelve un token que AutenticarSolicitud acepta', async () => {
    const { contenedores } = entornoMemoria();
    const { token, usuario, expiraEn } = await contenedores.usuario.cuEscritura.iniciarSesion(ADMIN);
    expect(usuario.rol).toBe('ADMIN');
    expect(usuario.ultimoAcceso).not.toBeNull();
    expect(expiraEn.getTime() - Date.now()).toBeGreaterThan(7.9 * 3600 * 1000);
    expect((await contenedores.usuario.cuLectura.autenticarSolicitud({ token })).id).toBe(usuario.id);
  });

  it('IniciarSesion da el mismo mensaje si el correo no existe o la contraseña está mal', async () => {
    const { contenedores } = entornoMemoria();
    await expect(contenedores.usuario.cuEscritura.iniciarSesion({ correo: 'nadie@x.com', contrasena: 'Clave1234' }))
      .rejects.toThrow('Correo o contraseña incorrectos');
    await expect(contenedores.usuario.cuEscritura.iniciarSesion({ correo: ADMIN.correo, contrasena: 'Mala1234' }))
      .rejects.toThrow('Correo o contraseña incorrectos');
  });

  it('AutenticarSolicitud rechaza tokens falsos y usuarios desactivados', async () => {
    const { contenedores, almacen } = entornoMemoria();
    await expect(contenedores.usuario.cuLectura.autenticarSolicitud({ token: 'abc' })).rejects.toThrow(ErrorNoAutenticado);
    const id = await registrar(contenedores);
    const { token } = await contenedores.usuario.cuEscritura.iniciarSesion({ correo: 'ana@correo.com', contrasena: 'Clave1234' });
    almacen.estado.usuarios.find((u) => u.id === id)!.activo = false;
    await expect(contenedores.usuario.cuLectura.autenticarSolicitud({ token })).rejects.toThrow(ErrorNoAutenticado);
  });

  it('EditarPerfil cambia el nombre y la contraseña solo si la actual es correcta', async () => {
    const { contenedores } = entornoMemoria();
    const id = await registrar(contenedores);
    await expect(contenedores.usuario.cuEscritura.editarPerfil({ idUsuario: id, contrasenaActual: 'Mala1234', contrasenaNueva: 'Nueva1234' }))
      .rejects.toThrow('contraseña actual');
    const u = await contenedores.usuario.cuEscritura.editarPerfil({ idUsuario: id, nombre: 'Ana María', contrasenaActual: 'Clave1234', contrasenaNueva: 'Nueva1234' });
    expect(u.nombre).toBe('Ana María');
    await expect(contenedores.usuario.cuEscritura.iniciarSesion({ correo: 'ana@correo.com', contrasena: 'Nueva1234' })).resolves.toBeDefined();
  });

  it('ObtenerPerfil devuelve los datos públicos', async () => {
    const { contenedores } = entornoMemoria();
    const perfil = await contenedores.usuario.cuLectura.obtenerPerfil({ idUsuario: 1 });
    expect(perfil.correo).toBe(ADMIN.correo);
    expect(perfil).not.toHaveProperty('contrasenaHash');
  });
});

describe('Casos de uso · Reconocimiento (CU-03)', () => {
  it('flujo completo: abrir sesión, registrar detección y cerrar', async () => {
    const { contenedores, reloj } = entornoMemoria();
    const id = await registrar(contenedores);
    const sesion = await contenedores.reconocimiento.cuEscritura.abrirSesion({ idUsuario: id, navegador: 'Chrome' });
    expect(sesion.fechaFin).toBeNull();

    reloj.avanzar(2000);
    const d = await contenedores.reconocimiento.cuEscritura.registrarDeteccion({
      idUsuario: id, idSesion: sesion.id, codigoGesto: 'Pointing_Up', confianza: 0.93, mano: 'Derecha',
    });
    expect(d).toMatchObject({ codigoGesto: 'Pointing_Up', codigoAccion: 'SIGUIENTE', confianza: 0.93 });

    reloj.avanzar(1000);
    const cerrada = await contenedores.reconocimiento.cuEscritura.cerrarSesion({ idUsuario: id, idSesion: sesion.id });
    expect(cerrada.fechaFin).toEqual(reloj.ahora());
    expect(cerrada.totalDetecciones).toBe(1);
  });

  it('RegistrarDeteccion rechaza una sesión cerrada (P-07 en el núcleo)', async () => {
    const { contenedores } = entornoMemoria();
    const id = await registrar(contenedores);
    const s = await contenedores.reconocimiento.cuEscritura.abrirSesion({ idUsuario: id });
    await contenedores.reconocimiento.cuEscritura.cerrarSesion({ idUsuario: id, idSesion: s.id });
    await expect(contenedores.reconocimiento.cuEscritura.registrarDeteccion({
      idUsuario: id, idSesion: s.id, codigoGesto: 'Victory', confianza: 0.9, mano: 'Izquierda',
    })).rejects.toThrow(ErrorConflicto);
  });

  it('RegistrarDeteccion no deja usar la sesión de otro usuario', async () => {
    const { contenedores } = entornoMemoria();
    const ana = await registrar(contenedores, 'ana@x.com');
    const luis = await registrar(contenedores, 'luis@x.com');
    const s = await contenedores.reconocimiento.cuEscritura.abrirSesion({ idUsuario: ana });
    await expect(contenedores.reconocimiento.cuEscritura.registrarDeteccion({
      idUsuario: luis, idSesion: s.id, codigoGesto: 'Victory', confianza: 0.9, mano: 'Derecha',
    })).rejects.toThrow(ErrorNoEncontrado);
  });

  it('RegistrarDeteccion usa la acción personalizada del usuario', async () => {
    const { contenedores } = entornoMemoria();
    const id = await registrar(contenedores);
    await contenedores.accion.cuEscritura.cambiarAsignacion({ idUsuario: id, idGesto: 3, idAccion: 7 }); // índice arriba → corazón
    const s = await contenedores.reconocimiento.cuEscritura.abrirSesion({ idUsuario: id });
    const d = await contenedores.reconocimiento.cuEscritura.registrarDeteccion({
      idUsuario: id, idSesion: s.id, codigoGesto: 'Pointing_Up', confianza: 0.8, mano: 'Derecha',
    });
    expect(d.codigoAccion).toBe('CORAZON');
  });

  it('AbrirSesionReconocimiento cierra la sesión que quedó abierta (flujo 9a)', async () => {
    const { contenedores, almacen, reloj } = entornoMemoria();
    const id = await registrar(contenedores);
    const primera = await contenedores.reconocimiento.cuEscritura.abrirSesion({ idUsuario: id });
    reloj.avanzar(5000);
    await contenedores.reconocimiento.cuEscritura.registrarDeteccion({
      idUsuario: id, idSesion: primera.id, codigoGesto: 'Thumb_Up', confianza: 0.9, mano: 'Derecha',
    });
    reloj.avanzar(60 * 60 * 1000); // el usuario cerró la pestaña y volvió una hora después
    await contenedores.reconocimiento.cuEscritura.abrirSesion({ idUsuario: id });
    const vieja = almacen.estado.sesiones.find((s) => s.id === primera.id)!;
    expect(vieja.fechaFin).toEqual(new Date(primera.fechaInicio.getTime() + 5000)); // hora de su última detección
  });
});

describe('Casos de uso · Acciones', () => {
  it('ListarGestos y ListarAcciones devuelven solo lo activo por defecto', async () => {
    const { contenedores, almacen } = entornoMemoria();
    almacen.estado.gestos[6].activo = false;
    expect(await contenedores.accion.cuLectura.listarGestos({})).toHaveLength(6);
    expect(await contenedores.accion.cuLectura.listarGestos({ incluirInactivos: true })).toHaveLength(7);
    expect(await contenedores.accion.cuLectura.listarAcciones({})).toHaveLength(8);
  });

  it('ObtenerAsignaciones devuelve la configuración inicial de la SRS', async () => {
    const { contenedores } = entornoMemoria();
    const id = await registrar(contenedores);
    const mapa = Object.fromEntries((await contenedores.accion.cuLectura.obtenerAsignaciones({ idUsuario: id }))
      .map((a) => [a.gesto.codigo, a.accion?.codigo]));
    expect(mapa).toEqual({
      Open_Palm: 'REPRODUCIR_PAUSAR', Closed_Fist: 'DETENER', Pointing_Up: 'SIGUIENTE', Victory: 'ANTERIOR',
      Thumb_Up: 'MARCAR_FAVORITA', Thumb_Down: 'QUITAR_FAVORITA', ILoveYou: 'CORAZON',
    });
  });

  it('CambiarAsignacion valida la acción y RestaurarAsignaciones vuelve al inicio', async () => {
    const { contenedores } = entornoMemoria();
    const id = await registrar(contenedores);
    await expect(contenedores.accion.cuEscritura.cambiarAsignacion({ idUsuario: id, idGesto: 1, idAccion: 999 })).rejects.toThrow(ErrorValidacion);
    const cambio = await contenedores.accion.cuEscritura.cambiarAsignacion({ idUsuario: id, idGesto: 1, idAccion: '8' });
    expect(cambio).toMatchObject({ accion: { codigo: 'NINGUNA' }, esPredeterminada: false });
    const restaurado = await contenedores.accion.cuEscritura.restaurarAsignaciones({ idUsuario: id });
    expect(restaurado.every((a) => a.esPredeterminada)).toBe(true);
  });
});

describe('Casos de uso · Historial y estadísticas', () => {
  async function conDetecciones() {
    const entorno = entornoMemoria();
    const { contenedores, reloj } = entorno;
    const id = await registrar(contenedores);
    const s = await contenedores.reconocimiento.cuEscritura.abrirSesion({ idUsuario: id });
    const gestos = ['Thumb_Up', 'Thumb_Up', 'Victory'];
    for (const [i, codigoGesto] of gestos.entries()) {
      reloj.avanzar(1000);
      await contenedores.reconocimiento.cuEscritura.registrarDeteccion({
        idUsuario: id, idSesion: s.id, codigoGesto, confianza: 0.8 + i * 0.05, mano: 'Derecha',
      });
    }
    return { ...entorno, id };
  }

  it('ConsultarHistorial filtra por gesto y pagina del más reciente al más antiguo', async () => {
    const { contenedores, id } = await conDetecciones();
    const todo = await contenedores.historial.cuLectura.consultarHistorial({ idUsuario: id, limite: '2' });
    expect(todo).toMatchObject({ total: 3, pagina: 1, limite: 2 });
    expect(todo.elementos[0].codigoGesto).toBe('Victory');
    const filtrado = await contenedores.historial.cuLectura.consultarHistorial({ idUsuario: id, gesto: 'Thumb_Up' });
    expect(filtrado.total).toBe(2);
    await expect(contenedores.historial.cuLectura.consultarHistorial({ idUsuario: id, gesto: 'Saludo' })).rejects.toThrow(ErrorValidacion);
  });

  it('ConsultarEstadisticas calcula gesto más usado y uso por día en hora de Ecuador', async () => {
    const { contenedores, id } = await conDetecciones();
    const e = await contenedores.historial.cuLectura.consultarEstadisticas({ idUsuario: id });
    expect(e.totalDetecciones).toBe(3);
    expect(e.gestoMasUsado?.codigo).toBe('Thumb_Up');
    expect(e.confianzaPromedio).toBeCloseTo(0.85, 3);
    expect(e.usoPorDia).toEqual([{ dia: '2026-10-09', total: 3 }]);
  });

  it('ExportarHistorial genera un CSV con encabezados y una fila por detección', async () => {
    const { contenedores, id } = await conDetecciones();
    const csv = await contenedores.historial.cuLectura.exportarHistorial({ idUsuario: id });
    const lineas = csv.contenido.trim().split('\r\n');
    expect(csv.nombreArchivo).toBe('historial-gestoweb-2026-10-09.csv');
    expect(lineas[0]).toContain('fecha_local');
    expect(lineas).toHaveLength(4);
    expect(lineas[1]).toContain('Victoria');
  });

  it('el historial de un usuario no incluye detecciones de otro', async () => {
    const { contenedores } = await conDetecciones();
    const otro = await registrar(contenedores, 'otro@x.com');
    expect((await contenedores.historial.cuLectura.consultarHistorial({ idUsuario: otro })).total).toBe(0);
  });
});

describe('Casos de uso · Administración', () => {
  it('EditarGesto cambia el umbral y lo registra en la bitácora', async () => {
    const { contenedores, almacen } = entornoMemoria();
    const g = await contenedores.administracion.cuEscritura.editarGesto({ idAdministrador: 1, idGesto: 4, cambios: { umbralConfianza: 0.85 } });
    expect(g.umbralConfianza).toBe(0.85);
    expect(almacen.estado.bitacora).toHaveLength(1);
    expect(almacen.estado.bitacora[0]).toMatchObject({ tablaAfectada: 'gestos', operacion: 'UPDATE' });
  });

  it('si el cambio es inválido no se guarda nada (ni el cambio ni la bitácora)', async () => {
    const { contenedores, almacen } = entornoMemoria();
    await expect(contenedores.administracion.cuEscritura.editarGesto({
      idAdministrador: 1, idGesto: 4, cambios: { nombre: 'Nuevo', umbralConfianza: 2 },
    })).rejects.toThrow(ErrorValidacion);
    expect(almacen.estado.gestos[3].nombre).toBe('Victoria');
    expect(almacen.estado.bitacora).toHaveLength(0);
  });

  it('GestionarAcciones crea, edita y desactiva acciones con sus reglas', async () => {
    const { contenedores } = entornoMemoria();
    const nueva = await contenedores.administracion.cuEscritura.gestionarAccion({
      tipo: 'crear', idAdministrador: 1, datos: { codigo: 'zoom', nombre: 'Acercar' },
    });
    expect(nueva.codigo).toBe('ZOOM');
    const editada = await contenedores.administracion.cuEscritura.gestionarAccion({
      tipo: 'editar', idAdministrador: 1, idAccion: nueva.id, datos: { nombre: 'Acercar imagen' },
    });
    expect(editada.nombre).toBe('Acercar imagen');
    const borrada = await contenedores.administracion.cuEscritura.gestionarAccion({ tipo: 'desactivar', idAdministrador: 1, idAccion: nueva.id });
    expect(borrada.activa).toBe(false);
    await expect(contenedores.administracion.cuEscritura.gestionarAccion({ tipo: 'desactivar', idAdministrador: 1, idAccion: 3 }))
      .rejects.toThrow('predeterminada');
  });

  it('ListarUsuarios y GestionarUsuarios: cambia roles, pero nadie se quita su propio rol', async () => {
    const { contenedores } = entornoMemoria();
    const id = await registrar(contenedores);
    expect(await contenedores.administracion.cuLectura.listarUsuarios()).toHaveLength(2);
    const u = await contenedores.administracion.cuEscritura.gestionarUsuario({ idAdministrador: 1, idUsuario: id, cambios: { rol: 'ADMIN', activo: false } });
    expect(u).toMatchObject({ rol: 'ADMIN', activo: false });
    await expect(contenedores.administracion.cuEscritura.gestionarUsuario({ idAdministrador: 1, idUsuario: 1, cambios: { rol: 'USUARIO' } }))
      .rejects.toThrow(ErrorConflicto);
  });

  it('ConsultarEstadisticasGenerales y ConsultarBitacora', async () => {
    const { contenedores } = entornoMemoria();
    const id = await registrar(contenedores);
    const s = await contenedores.reconocimiento.cuEscritura.abrirSesion({ idUsuario: id });
    await contenedores.reconocimiento.cuEscritura.registrarDeteccion({ idUsuario: id, idSesion: s.id, codigoGesto: 'ILoveYou', confianza: 0.99, mano: 'Izquierda' });
    const e = await contenedores.administracion.cuLectura.consultarEstadisticasGenerales({});
    expect(e).toMatchObject({ totalUsuarios: 2, totalSesiones: 1, totalDetecciones: 1 });
    expect(e.usoPorGesto.find((g) => g.codigo === 'ILoveYou')).toMatchObject({ total: 1, usuariosDistintos: 1 });

    await contenedores.administracion.cuEscritura.editarGesto({ idAdministrador: 1, idGesto: 1, cambios: { activo: false } });
    const b = await contenedores.administracion.cuLectura.consultarBitacora({});
    expect(b.elementos[0]).toMatchObject({ nombreUsuario: 'Administrador', tablaAfectada: 'gestos' });
  });
});
