# Arquitectura hexagonal y principios SOLID en GestoWeb

Este documento explica **qué** se hizo, **cómo** se ve en el código y **por qué** conviene en este proyecto. Cada sección empieza con la idea en simple y luego va a lo técnico.

---

## 1. La idea en simple

Piensen en una **consola de videojuegos**. La consola (el núcleo) no sabe qué control le van a conectar: solo define la **forma del puerto**. Cualquier control con esa forma funciona: el original, uno genérico o uno de prueba. Si el control se daña, se cambia el control, no la consola.

En GestoWeb:

| Consola | **Núcleo**: las reglas del negocio (qué es un usuario, cuándo se acepta un gesto, qué acción se ejecuta, qué se guarda). |
|---|---|
| **Forma del puerto** | **Puerto**: una clase abstracta en TypeScript (`PuertoEntrada…` / `PuertoSalida…`) que dice *qué* necesita el núcleo, no *cómo* se hace. |
| **Control** | **Adaptador**: el código concreto que cumple el contrato (`AdapEntrada_…` para Express, `AdapSalida_…` para PostgreSQL, memoria, bcrypt, JWT, la cámara, MediaPipe). |
| **Conectar el control** | **Raíz de composición**: `backend/src/contenedor/` y `frontend/src/app/app.config.ts`, los únicos lugares que eligen qué adaptador va en cada puerto. |

La estructura y los nombres son los del proyecto de clase de Programación Web (`ProgramacionWeb`), adaptados a TypeScript. La sección 3.6 tiene la correspondencia pieza por pieza y la skill `.claude/skills/arquitectura-hexagonal` las reglas completas.

La regla de oro: **las dependencias siempre apuntan hacia adentro**. Infraestructura conoce a aplicación, aplicación conoce a dominio, y dominio no conoce a nadie.

```
            ┌──────────────────── Infraestructura ────────────────────┐
            │  AdapEntrada_*Web          AdapSalida_*Postgres / *Memoria│
            │  (Express)                 AdapSalida_CifradorBcrypt, …  │
            │        │                          ▲                      │
            │        ▼                          │ heredan de           │
            │   ┌─────────────── Aplicación ──────────────┐            │
            │   │  PuertoEntrada*  ◄──  CasoUso_*Lectura  │            │
            │   │                       CasoUso_*Escritura│            │
            │   │                            ▼            │            │
            │   │                  PuertoSalida*          │            │
            │   │        ┌──────── Dominio ────────┐      │            │
            │   │        │ Usuario, Gesto, Accion, │      │            │
            │   │        │ Sesion, Deteccion,      │      │            │
            │   │        │ reglas puras            │      │            │
            │   │        └─────────────────────────┘      │            │
            │   └─────────────────────────────────────────┘            │
            └──────────────────────────────────────────────────────────┘
```

## 2. Por qué en este proyecto

No se eligió por moda; resuelve problemas concretos de GestoWeb:

1. **El modelo de IA es la pieza más inestable.** MediaPipe cambia de versión (en 2026 pasó de 0.10 a 1.x) y en el futuro se quiere entrenar gestos propios (SRS §13.3). Con un puerto `ReconocedorGestos`, cambiar de modelo es cambiar **un archivo**.
2. **La cámara no siempre está disponible.** Para desarrollar, probar y para el plan B de la demo, la cámara y el modelo se reemplazan por adaptadores simulados (`?simulado=1`) sin tocar el resto.
3. **Probar sin infraestructura.** Las reglas de aceptación (medio segundo, pausa de 1 s, umbral) y los casos de uso se prueban con datos falsos, sin base de datos ni navegador: 51 pruebas del backend corren en ~6 segundos.
4. **Cuatro personas trabajando en paralelo.** Los puertos y el contrato de la API son el acuerdo de la semana 1 (SRS §11). Juan programa casos de uso contra el puerto `PuertoSalidaDeteccion` usando el adaptador en memoria mientras Terry termina el de PostgreSQL; Neils avanza pantallas contra `ApiGestoWeb`.
5. **La privacidad queda en la estructura.** El único adaptador que toca la imagen (la cámara) vive en el navegador; el núcleo del frontend solo recibe `{ codigo, confianza, mano, puntos }`. No existe un camino en el código por donde una imagen llegue al servidor (y la API rechaza cuerpos de más de 20 KB).
6. **Es un requisito medible:** RNF-12 y la prueba de aceptación P-09.

## 3. Cómo se aplicó en el backend

### 3.1 Dominio: reglas sin librerías

`backend/src/dominio/` no tiene ningún `import` de Express, `pg`, bcrypt o JWT. Ejemplo, la regla del umbral vive en la entidad:

```ts
// dominio/gesto/Gesto.ts
aceptaConfianza(confianza: number): boolean {
  return confianza >= this.datos.umbralConfianza;
}
```

Y la regla "qué acción ejecuta un gesto para este usuario" es una función pura:

```ts
// dominio/accion/Asignacion.ts
export function resolverAccionEfectiva(gesto, asignacion, accionesPorId): AccionEfectiva {
  // 1. la que eligió el usuario, si sigue activa
  // 2. si no, la predeterminada del gesto
  // 3. si tampoco está activa, ninguna
}
```

Los errores tampoco saben de HTTP: el dominio lanza `ErrorConflicto`, y solo el adaptador web sabe que eso es un 409.

### 3.2 Aplicación: puertos y casos de uso

**Puerto de salida** (lo que el núcleo necesita). Es una clase abstracta, la versión tipada del `throw new Error("Debes implementar …")` del proyecto de clase:

```ts
// aplicacion/puerto/salida/PuertoSalidaDeteccion.ts
export abstract class PuertoSalidaDeteccion {
  abstract guardar(nueva: NuevaDeteccion): Promise<Deteccion>;
  abstract historial(filtro: FiltroHistorial): Promise<PaginaHistorial>;
  abstract totalesPorGesto(idUsuario: number | null, rango: RangoFechas): Promise<TotalPorGesto[]>;
  abstract usoPorDia(idUsuario: number | null, rango: RangoFechas, zonaHoraria: string): Promise<UsoPorDia[]>;
  // …
}
```

**Puerto de entrada** (lo que el exterior puede pedirle al núcleo), uno de lectura y otro de escritura por módulo:

```ts
// aplicacion/puerto/entrada/PuertoEntradaReconocimientoEscritura.ts
export abstract class PuertoEntradaReconocimientoEscritura {
  abstract abrirSesion(dto: DtoAbrirSesion): Promise<DtoSesion>;
  abstract registrarDeteccion(dto: DtoRegistrarDeteccion): Promise<DtoDeteccion>;
  abstract cerrarSesion(dto: DtoCerrarSesion): Promise<DtoSesion>;
}
```

**Caso de uso**: hereda de su puerto de entrada, recibe los puertos de salida por el constructor y no sabe qué hay detrás:

```ts
// aplicacion/caso_uso/escritura/CasoUso_ReconocimientoEscritura.ts
export class CasoUso_ReconocimientoEscritura extends PuertoEntradaReconocimientoEscritura {
  constructor(
    private readonly sesiones: PuertoSalidaSesion,
    private readonly gestos: PuertoSalidaGesto,
    private readonly acciones: PuertoSalidaAccion,
    private readonly asignaciones: PuertoSalidaAsignacion,
    private readonly detecciones: PuertoSalidaDeteccion,
    private readonly reloj: PuertoSalidaReloj,
  ) {
    super();
  }
  // abrirSesion, registrarDeteccion, cerrarSesion
}
```

Los 16 casos de uso de la SRS §7.2, más 6 de apoyo, son métodos de 8 clases separadas en `caso_uso/lectura/` (consultas) y `caso_uso/escritura/` (cambios): `CasoUso_UsuarioLectura/Escritura`, `CasoUso_ReconocimientoEscritura`, `CasoUso_AccionLectura/Escritura`, `CasoUso_HistorialLectura` y `CasoUso_AdministracionLectura/Escritura`. Los datos que entran y salen son DTO (`aplicacion/dto/Dto<Modulo>.ts`), y las entidades se convierten a respuesta con `usuarioARespuesta`, `gestoARespuesta`… (`Respuesta<Modulo>.ts`), que nunca exponen el hash de la contraseña.

### 3.3 Infraestructura: adaptadores

| Puerto | Adaptador versión 1 | Adaptador alternativo |
|---|---|---|
| `PuertoSalidaUsuario`, `…Gesto`, `…Accion`, `…Asignacion`, `…Sesion`, `…Deteccion`, `…Bitacora` | `AdapSalida_<Recurso>Postgres` | `AdapSalida_<Recurso>Memoria` |
| `PuertoSalidaUnidadDeTrabajo` | `AdapSalida_UnidadDeTrabajoPostgres` (BEGIN/COMMIT/ROLLBACK) | `AdapSalida_UnidadDeTrabajoMemoria` (copia y restaura el estado) |
| `PuertoSalidaCifrador` | `AdapSalida_CifradorBcrypt` | — |
| `PuertoSalidaTokens` | `AdapSalida_TokensJwt` | — |
| `PuertoSalidaReloj` | `AdapSalida_RelojSistema` | `RelojFalso` (pruebas) |
| `PuertoEntrada*` | `AdapEntrada_<Modulo>Web` (Express) | Las pruebas llaman a los casos de uso directamente |

Cada adaptador vive en su propio archivo en `infraestructura/adaptadores/entrada/` o `infraestructura/adaptadores/salida/`. Las conexiones (`ConexionPostgresql`, `AlmacenMemoria`) están en `infraestructura/base_dato/`.

Los adaptadores traducen el mundo exterior al idioma del núcleo. Por ejemplo, la conexión de PostgreSQL convierte el error del trigger (`GW001`) y la llave duplicada (`23505`) en errores del dominio:

```ts
// infraestructura/base_dato/ConexionPostgresql.ts
case 'GW001': return new ErrorConflicto('La sesión de reconocimiento ya está cerrada', 'SESION_CERRADA');
case '23505': return new ErrorConflicto('Ya existe un registro con esos datos');
```

El adaptador de entrada es el único que toca `req` y `res`: lee la petición, llama al caso de uso y responde. Los ids de la URL los pasa sin validar; los valida el caso de uso.

```ts
// infraestructura/adaptadores/entrada/AdapEntrada_ReconocimientoWeb.ts
async registrarDeteccion(req: Request, res: Response): Promise<void> {
  const { codigoGesto, confianza, mano, fechaHora } = req.body ?? {};
  res.status(201).json(await this.cuEscritura.registrarDeteccion({
    idUsuario: usuarioDe(res).id, idSesion: req.params.id, codigoGesto, confianza, mano, fechaHora,
  }));
}
```

Y `app.ts` solo enruta, una línea por endpoint, como `app.js` del proyecto de clase:

```ts
app.post('/api/sesiones/:id/detecciones', manejar((req, res) => reconocimiento.registrarDeteccion(req, res)));
```

### 3.4 `contenedor/`: el único lugar que lo sabe todo

Como `ContenedorUsuario.js` en el proyecto de clase, cada módulo tiene su fábrica que devuelve `{ cuLectura, cuEscritura, adap }`:

```ts
// contenedor/ContenedorUsuario.ts
export function crearContenedorUsuario(p: PuertosDeSalida) {
  const cuLectura = new CasoUso_UsuarioLectura(p.usuarios, p.tokens);
  const cuEscritura = new CasoUso_UsuarioEscritura(p.usuarios, p.cifrador, p.tokens, p.reloj);
  const adap = new AdapEntrada_UsuarioWeb(cuLectura, cuEscritura);
  return { cuLectura, cuEscritura, adap };
}
```

Y `contenedor/index.ts` elige los adaptadores de salida:

```ts
export function componer(config: Configuracion, pool?: Pool): Contenedores {
  const reloj = new AdapSalida_RelojSistema();
  const persistencia = config.repositorios === 'memoria'
    ? crearPersistenciaMemoria(reloj)          // ← P-09: cambiar esta línea
    : crearPersistenciaPostgres(pool!);
  return crearContenedores({
    ...persistencia,
    cifrador: new AdapSalida_CifradorBcrypt(),
    tokens: new AdapSalida_TokensJwt(config.jwt.secreto, config.jwt.duracionSegundos),
    reloj,
    zonaHoraria: config.zonaHoraria,
  });
}
```

`main.ts` solo arranca: lee la configuración, abre la conexión, pide los contenedores y levanta Express.

### 3.5 Un caso difícil: la bitácora "en la misma transacción"

La SRS pide que la bitácora se escriba en la misma transacción que el cambio del administrador. Una transacción es algo de PostgreSQL… ¿cómo lo pide el núcleo sin conocer PostgreSQL? Con un puerto más:

```ts
// aplicacion/puerto/salida/PuertoSalidaUnidadDeTrabajo.ts
export abstract class PuertoSalidaUnidadDeTrabajo {
  abstract ejecutar<T>(trabajo: (repos: RepositoriosTransaccionales) => Promise<T>): Promise<T>;
}
```

`CasoUso_AdministracionEscritura.editarGesto` dice "haz esto como una sola cosa"; el adaptador PostgreSQL lo traduce a `BEGIN … COMMIT/ROLLBACK` y el de memoria a "copiar el estado y restaurarlo si falla". Hay una prueba que lo comprueba en ambos: un cambio inválido no deja ni el cambio ni la línea en la bitácora.

### 3.6 Correspondencia con el proyecto de clase

| Proyecto de clase (`ProgramacionWeb`) | GestoWeb |
|---|---|
| `aplicacion/puerto/entrada/PuertoEntradaUsuarioWeb.js` | `aplicacion/puerto/entrada/PuertoEntrada<Modulo>Lectura.ts` y `…Escritura.ts` |
| `aplicacion/puerto/salida/PuertoSalidaUsuarioWeb.js` | `aplicacion/puerto/salida/PuertoSalida<Recurso>.ts` |
| `aplicacion/caso_uso/lectura/CasoUso_UsuarioLectura.js` | `aplicacion/caso_uso/lectura/CasoUso_<Modulo>Lectura.ts` |
| `aplicacion/caso_uso/escritura/CasoUso_UsuarioEscritura.js` | `aplicacion/caso_uso/escritura/CasoUso_<Modulo>Escritura.ts` |
| `aplicacion/dto/DtoUsuario.js`, `RespuestaUsuario.js` | `aplicacion/dto/Dto<Modulo>.ts`, `Respuesta<Modulo>.ts` |
| `infraestructura/adaptadores/entrada/AdapEntrada_UsuarioWeb.js` | `infraestructura/adaptadores/entrada/AdapEntrada_<Modulo>Web.ts` |
| `infraestructura/adaptadores/salida/AdapSalida_PostresqlOrm.js` / `AdapSalida_MongoDbOdm.js` | `infraestructura/adaptadores/salida/AdapSalida_<Recurso>Postgres.ts` / `…Memoria.ts` |
| `infraestructura/base_dato/ConexionPostgresql.js` | `infraestructura/base_dato/ConexionPostgresql.ts` |
| `contenedor/ContenedorUsuario.js` → `{ adapSalida, cuUsuario, cuUsuarioEscritura, adap }` | `contenedor/Contenedor<Modulo>.ts` → `{ cuLectura, cuEscritura, adap }` |
| `app.js`: `app.get(ruta, (req, res) => contenedor.adap.metodo(req, res))` | `app.ts`: `app.get(ruta, manejar((req, res) => adap.metodo(req, res)))` |

Las diferencias justificadas por la SRS (TypeScript, `pg` sin ORM, adaptadores en memoria en vez de MongoDB, bcrypt y JWT, manejo de errores centralizado, Angular) están en la tabla de desviaciones aceptadas de la skill.

## 4. Cómo se aplicó en el frontend

La SRS §7.4 pide que el frontend también aísle la cámara y el modelo. La estructura es la misma, en pequeño:

| Capa | Archivos |
|---|---|
| Dominio | `nucleo/dominio/gesto.ts` (códigos, `ResultadoReconocimiento`, puntos de la mano), `modelos.ts` |
| Puertos | `ReconocedorGestos`, `Camara`, `ApiGestoWeb` (clases abstractas: Angular las usa como token de inyección) |
| Servicios del núcleo | `ReglasAceptacion`, `EjecutorAcciones`, `ColaDetecciones` (TypeScript puro) y `MotorReconocimiento` (coordina) |
| Adaptadores | `ReconocedorMediaPipe`, `CamaraNavegador`, `ApiGestoWebHttp` + interceptor, y los simulados |
| Raíz de composición | `app.config.ts` |

```ts
// frontend/src/app/app.config.ts
{ provide: ApiGestoWeb,       useClass: ApiGestoWebHttp },
{ provide: Camara,            useFactory: () => (simulado ? new CamaraSimulada()     : new CamaraNavegador()) },
{ provide: ReconocedorGestos, useFactory: () => (simulado ? new ReconocedorSimulado() : new ReconocedorMediaPipe()) },
```

`ReconocedorMediaPipe` es el **único archivo** del frontend que importa `@mediapipe/tasks-vision`. Las pantallas tampoco lo conocen: el dibujo de los puntos usa `CONEXIONES_MANO` del dominio, no la utilidad de dibujo de MediaPipe.

## 5. ¿Cómo sabemos que funciona? (P-09)

1. **Pruebas de contrato** (`backend/pruebas/postgres/contrato.prueba.ts`): las mismas pruebas se ejecutan dos veces, con adaptadores PostgreSQL y con adaptadores en memoria, sin tocar el núcleo. Ambas pasan.
2. **Modo memoria** (`REPOSITORIOS=memoria`): el backend completo funciona sin base de datos.
3. **Modo simulado** (`?simulado=1`): el frontend completo funciona sin cámara ni modelo. La prueba de extremo a extremo del proyecto se hizo así: registro, siete gestos, panel, historial, CSV, estadísticas, administración y bitácora, con 14 comprobaciones en verde.
4. **Pruebas del motor del frontend** con una cámara, un modelo y una API falsos (`motor-reconocimiento.spec.ts`).

---

## 6. Principios SOLID

### S — Responsabilidad única
*En simple: cada pieza tiene un solo motivo para cambiar.*

- **Un método = una tarea, una clase = un módulo**: `registrarUsuario`, `iniciarSesion`, `cambiarAsignacion`, `exportarHistorial`… Si cambia la regla de exportar, solo se toca ese método de `CasoUso_HistorialLectura`.
- Lectura y escritura están en clases separadas (`CasoUso_AdministracionLectura` y `…Escritura`): consultar y modificar cambian por motivos distintos.
- Una clase por archivo: cada adaptador de salida, de entrada y cada puerto tiene el suyo.
- En el frontend, `ReglasAceptacion` solo decide si un gesto se acepta; `EjecutorAcciones` solo ejecuta; `ColaDetecciones` solo envía y reintenta; `MotorReconocimiento` solo coordina; `PanelDemostracion` solo sabe mover imágenes.
- Los adaptadores de entrada no tienen reglas; el manejador de errores es el único que conoce los códigos HTTP.

**Por qué importa aquí:** con cuatro integrantes, archivos con una sola responsabilidad significan menos conflictos de Git y revisiones más cortas.

### O — Abierto/cerrado
*En simple: se puede agregar comportamiento nuevo sin modificar lo que ya funciona.*

- **`EjecutorAcciones`** es un registro de manejadores. El panel agrega sus acciones así, sin modificar el ejecutor:
  ```ts
  this.motor.ejecutor.registrarVarios({
    SIGUIENTE: () => this.mover(1),
    ANTERIOR:  () => this.mover(-1),
    CORAZON:   () => this.mostrarCorazon(),
    // …
  });
  ```
  Una acción nueva (por ejemplo `ZOOM`) es una línea más aquí; no se toca el motor ni un `switch` gigante.
- **Adaptadores nuevos** (MySQL, otro modelo, una app móvil como nuevo adaptador de entrada) se agregan sin modificar los casos de uso.
- Las reglas de aceptación reciben su configuración (`REGLAS_SRS`) desde afuera: otros tiempos no requieren editar la clase.

### L — Sustitución de Liskov
*En simple: cualquier implementación de un contrato debe poder reemplazar a otra sin que el sistema note la diferencia.*

- `AdapSalida_UsuarioMemoria` y `AdapSalida_UsuarioPostgres` cumplen exactamente el mismo comportamiento, **incluidas las reglas que en PostgreSQL hacen los triggers**: el adaptador en memoria también crea las 7 asignaciones al crear un usuario, rechaza detecciones en sesiones cerradas y cierra la sesión anterior con la hora de su última detección. Las pruebas de contrato lo verifican.
- `CamaraSimulada` y `ReconocedorSimulado` sustituyen a la cámara y a MediaPipe; el motor y las pantallas no cambian.
- `RelojFalso` sustituye a `AdapSalida_RelojSistema` en las pruebas.

**Ojo:** Liskov no es solo "compila con la misma interfaz", es "se comporta igual". Por eso el adaptador en memoria imita los triggers: si no lo hiciera, el núcleo funcionaría distinto según el adaptador y la prueba P-09 no demostraría nada.

### I — Segregación de interfaces
*En simple: nadie debe depender de métodos que no usa.*

- El puerto `ApiGestoWeb` del frontend tiene unos 25 métodos. En vez de que todos dependan de todo, se divide en `ApiAutenticacion`, `ApiConfiguracion`, `ApiReconocimiento`, `ApiHistorial` y `ApiAdministracion`, y cada parte pide solo la suya:
  ```ts
  private readonly api: ApiReconocimiento = inject(ApiGestoWeb); // el motor no ve métodos de administración
  ```
- En el backend, cada clase de casos de uso recibe **solo los puertos que usa**: `CasoUso_UsuarioLectura` recibe dos; `CasoUso_ReconocimientoEscritura`, seis. Los puertos de salida están separados por agregado (`PuertoSalidaUsuario`, `PuertoSalidaGesto`…), no en un "repositorio general", y los de entrada por módulo y por lectura/escritura.
- `RepositoriosTransaccionales` expone solo los cuatro repositorios que usan las operaciones de administración.

### D — Inversión de dependencias
*En simple: lo importante (las reglas) no depende de los detalles (base de datos, librerías); los detalles dependen de lo importante.*

- Los casos de uso dependen de **puertos abstractos** (`PuertoSalidaDeteccion`, `PuertoSalidaCifrador`, `PuertoSalidaReloj`), nunca de `pg`, `bcryptjs` o `Date.now()` directamente.
- Los puertos los define **el núcleo**, según lo que necesita; los adaptadores las implementan. La flecha de dependencia apunta desde la infraestructura hacia el núcleo.
- Las dependencias entran **por el constructor** (backend) o por **inyección de Angular** (frontend), y se eligen en una sola raíz de composición.
- Incluso la hora es un puerto (`PuertoSalidaReloj`): por eso se puede probar "la pausa de 1 segundo" o "cerrar la sesión con la hora de la última detección" sin esperar ni depender del reloj real.

---

## 7. Lo que cuesta (y por qué vale la pena)

Ser honestos con los costos también es parte de la arquitectura:

- **Más archivos y más indirección.** Para guardar una detección se pasa por `AdapEntrada_ReconocimientoWeb` → `CasoUso_ReconocimientoEscritura` → `PuertoSalidaDeteccion` → `AdapSalida_DeteccionPostgres`. Para un CRUD de 3 tablas sería exagerado; aquí se justifica por la cámara, el modelo cambiante y el trabajo en paralelo.
- **Mantener los adaptadores en memoria.** Si se agrega una regla en un trigger, hay que imitarla en memoria. Las pruebas de contrato avisan cuando se olvida.
- **Algunas reglas están dos veces** (por ejemplo, "sesión cerrada" en el dominio y en el trigger). Es intencional, como defensa en profundidad: la base protege los datos aunque alguien los toque con pgAdmin, y el núcleo da mensajes claros sin depender de la base.

## 8. Preguntas que puede hacer el docente

**¿Dónde está el hexágono en el código?** En `backend/src`: `dominio/` y `aplicacion/` son el hexágono; `infraestructura/` son los adaptadores alrededor; `contenedor/` los conecta. Los nombres siguen el proyecto de clase (sección 3.6).

**¿Qué pasa si cambian PostgreSQL por MySQL?** Se escriben adaptadores MySQL que cumplan los mismos puertos y se cambia una línea en `contenedor/index.ts`. Ni el dominio ni los casos de uso se tocan; las pruebas de contrato confirman que el nuevo adaptador se comporta igual.

**¿Por qué los triggers no rompen la arquitectura?** La base es un detalle detrás de un adaptador. Los triggers optimizan y protegen los datos, pero el núcleo no depende de ellos: con el adaptador en memoria funciona igual.

**¿Dónde se ve la inversión de dependencias?** En que `CasoUso_ReconocimientoEscritura` importa `PuertoSalidaDeteccion` (un puerto del núcleo) y no `AdapSalida_DeteccionPostgres`. La clase concreta solo aparece en `contenedor/`.

**¿Cómo se prueban las reglas de aceptación sin cámara?** Son una clase pura que recibe resultados y una hora: la prueba le da "pulgar arriba con 90 % durante 480 ms" y comprueba que todavía no se acepte.
