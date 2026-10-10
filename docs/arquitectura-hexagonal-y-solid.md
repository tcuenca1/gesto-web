# Arquitectura hexagonal y principios SOLID en GestoWeb

Este documento explica **qué** se hizo, **cómo** se ve en el código y **por qué** conviene en este proyecto. Cada sección empieza con la idea en simple y luego va a lo técnico.

---

## 1. La idea en simple

Piensen en una **consola de videojuegos**. La consola (el núcleo) no sabe qué control le van a conectar: solo define la **forma del puerto**. Cualquier control con esa forma funciona: el original, uno genérico o uno de prueba. Si el control se daña, se cambia el control, no la consola.

En GestoWeb:

| Consola | **Núcleo**: las reglas del negocio (qué es un usuario, cuándo se acepta un gesto, qué acción se ejecuta, qué se guarda). |
|---|---|
| **Forma del puerto** | **Puerto**: un contrato en TypeScript (`interface` o clase abstracta) que dice *qué* necesita el núcleo, no *cómo* se hace. |
| **Control** | **Adaptador**: el código concreto que cumple el contrato (PostgreSQL, Express, bcrypt, JWT, la cámara, MediaPipe). |
| **Conectar el control** | **Raíz de composición**: `backend/src/main.ts` y `frontend/src/app/app.config.ts`, los únicos lugares que eligen qué adaptador va en cada puerto. |

La regla de oro: **las dependencias siempre apuntan hacia adentro**. Infraestructura conoce a aplicación, aplicación conoce a dominio, y dominio no conoce a nadie.

```
            ┌──────────────────── Infraestructura ────────────────────┐
            │  Express (API REST)        PostgreSQL / memoria          │
            │  bcrypt   JWT   Reloj      (adaptadores de salida)       │
            │        │                          ▲                      │
            │        ▼                          │ implementan          │
            │   ┌─────────────── Aplicación ──────────────┐            │
            │   │  Puertos de entrada  ──►  Casos de uso  │            │
            │   │  (CasoDeUso<E,S>)          │            │            │
            │   │                            ▼            │            │
            │   │                  Puertos de salida      │            │
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
4. **Cuatro personas trabajando en paralelo.** Los puertos y el contrato de la API son el acuerdo de la semana 1 (SRS §11). Juan programa casos de uso contra el puerto `DeteccionRepositorio` usando el adaptador en memoria mientras Terry termina el de PostgreSQL; Neils avanza pantallas contra `ApiGestoWeb`.
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

### 3.2 Aplicación: casos de uso y puertos

**Puerto de salida** (lo que el núcleo necesita):

```ts
// aplicacion/puertos/salida/DeteccionRepositorio.ts
export interface DeteccionRepositorio {
  guardar(nueva: NuevaDeteccion): Promise<Deteccion>;
  historial(filtro: FiltroHistorial): Promise<PaginaHistorial>;
  totalesPorGesto(idUsuario: number | null, rango: RangoFechas): Promise<TotalPorGesto[]>;
  usoPorDia(idUsuario: number | null, rango: RangoFechas, zonaHoraria: string): Promise<UsoPorDia[]>;
  // …
}
```

**Puerto de entrada** (lo que el exterior puede pedirle al núcleo):

```ts
// aplicacion/puertos/entrada/CasoDeUso.ts
export interface CasoDeUso<Entrada, Salida> {
  ejecutar(entrada: Entrada): Promise<Salida>;
}
export type RegistrarDeteccionPuerto = CasoDeUso<EntradaRegistrarDeteccion, DeteccionDTO>;
```

**Caso de uso**: recibe sus puertos por el constructor y no sabe qué hay detrás:

```ts
// aplicacion/casos-uso/reconocimiento/RegistrarDeteccion.ts
export class RegistrarDeteccion implements RegistrarDeteccionPuerto {
  constructor(
    private readonly sesiones: SesionRepositorio,
    private readonly gestos: GestoRepositorio,
    private readonly acciones: AccionRepositorio,
    private readonly asignaciones: AsignacionRepositorio,
    private readonly detecciones: DeteccionRepositorio,
    private readonly reloj: Reloj,
  ) {}
  // …
}
```

Los 16 casos de uso de la SRS §7.2 están en `aplicacion/casos-uso/`, más 6 de apoyo (por ejemplo `AutenticarSolicitud` y `ListarGestos`): 22 en total, uno por archivo o por par muy relacionado.

### 3.3 Infraestructura: adaptadores

| Puerto | Adaptador versión 1 | Adaptador alternativo |
|---|---|---|
| `UsuarioRepositorio`, `GestoRepositorio`, `AccionRepositorio`, `AsignacionRepositorio`, `SesionRepositorio`, `DeteccionRepositorio`, `BitacoraRepositorio` | `*RepositorioPg` (PostgreSQL) | `*RepositorioMemoria` |
| `UnidadDeTrabajo` | `UnidadDeTrabajoPg` (BEGIN/COMMIT/ROLLBACK) | `UnidadDeTrabajoMemoria` (copia y restaura el estado) |
| `CifradorContrasenas` | `CifradorBcrypt` | — |
| `GeneradorTokens` | `GeneradorTokensJwt` | — |
| `Reloj` | `RelojSistema` | `RelojFalso` (pruebas) |
| Puertos de entrada | API REST con Express (`infraestructura/http`) | Las pruebas llaman a los casos de uso directamente |

Los adaptadores traducen el mundo exterior al idioma del núcleo. Por ejemplo, el de PostgreSQL convierte el error del trigger (`GW001`) y la llave duplicada (`23505`) en errores del dominio:

```ts
// infraestructura/persistencia/postgres/conexion.ts
case 'GW001': return new ErrorConflicto('La sesión de reconocimiento ya está cerrada', 'SESION_CERRADA');
case '23505': return new ErrorConflicto('Ya existe un registro con esos datos');
```

Y el controlador Express es delgado a propósito: lee la petición, llama al caso de uso y responde.

```ts
// infraestructura/http/rutas/rutasUsuario.ts
r.post('/sesiones/:id/detecciones', manejar(async (req, res) => {
  const { codigoGesto, confianza, mano, fechaHora } = req.body ?? {};
  res.status(201).json(await casos.reconocimiento.registrarDeteccion.ejecutar({
    idUsuario: usuarioDe(res).id, idSesion: id(req.params.id), codigoGesto, confianza, mano, fechaHora,
  }));
}));
```

### 3.4 `main.ts`: el único lugar que lo sabe todo

```ts
export function componer(config: Configuracion, pool?: Pool): CasosDeUso {
  const reloj = new RelojSistema();
  const persistencia = config.repositorios === 'memoria'
    ? persistenciaMemoria(reloj)          // ← P-09: cambiar esta línea
    : persistenciaPostgres(pool!);
  return crearCasosDeUso({
    ...persistencia,
    cifrador: new CifradorBcrypt(),
    tokens: new GeneradorTokensJwt(config.jwt.secreto, config.jwt.duracionSegundos),
    reloj,
    zonaHoraria: config.zonaHoraria,
  });
}
```

### 3.5 Un caso difícil: la bitácora "en la misma transacción"

La SRS pide que la bitácora se escriba en la misma transacción que el cambio del administrador. Una transacción es algo de PostgreSQL… ¿cómo lo pide el núcleo sin conocer PostgreSQL? Con un puerto más:

```ts
// aplicacion/puertos/salida/UnidadDeTrabajo.ts
export interface UnidadDeTrabajo {
  ejecutar<T>(trabajo: (repos: RepositoriosTransaccionales) => Promise<T>): Promise<T>;
}
```

El caso de uso `EditarGesto` dice "haz esto como una sola cosa"; el adaptador PostgreSQL lo traduce a `BEGIN … COMMIT/ROLLBACK` y el de memoria a "copiar el estado y restaurarlo si falla". Hay una prueba que lo comprueba en ambos: un cambio inválido no deja ni el cambio ni la línea en la bitácora.

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

- **Un caso de uso = una tarea**: `RegistrarUsuario`, `IniciarSesion`, `CambiarAsignacion`, `ExportarHistorial`… Si cambia la regla de exportar, solo se toca `ExportarHistorial.ts`.
- `ListarUsuarios` y `GestionarUsuarios` están separados: leer y modificar cambian por motivos distintos.
- En el frontend, `ReglasAceptacion` solo decide si un gesto se acepta; `EjecutorAcciones` solo ejecuta; `ColaDetecciones` solo envía y reintenta; `MotorReconocimiento` solo coordina; `PanelDemostracion` solo sabe mover imágenes.
- Los controladores no tienen reglas; el manejador de errores es el único que conoce los códigos HTTP.

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

- `UsuarioRepositorioMemoria` y `UsuarioRepositorioPg` cumplen exactamente el mismo comportamiento, **incluidas las reglas que en PostgreSQL hacen los triggers**: el adaptador en memoria también crea las 7 asignaciones al crear un usuario, rechaza detecciones en sesiones cerradas y cierra la sesión anterior con la hora de su última detección. Las pruebas de contrato lo verifican.
- `CamaraSimulada` y `ReconocedorSimulado` sustituyen a la cámara y a MediaPipe; el motor y las pantallas no cambian.
- `RelojFalso` sustituye a `RelojSistema` en las pruebas.

**Ojo:** Liskov no es solo "compila con la misma interfaz", es "se comporta igual". Por eso el adaptador en memoria imita los triggers: si no lo hiciera, el núcleo funcionaría distinto según el adaptador y la prueba P-09 no demostraría nada.

### I — Segregación de interfaces
*En simple: nadie debe depender de métodos que no usa.*

- El puerto `ApiGestoWeb` del frontend tiene unos 25 métodos. En vez de que todos dependan de todo, se divide en `ApiAutenticacion`, `ApiConfiguracion`, `ApiReconocimiento`, `ApiHistorial` y `ApiAdministracion`, y cada parte pide solo la suya:
  ```ts
  private readonly api: ApiReconocimiento = inject(ApiGestoWeb); // el motor no ve métodos de administración
  ```
- En el backend, cada caso de uso recibe **solo los puertos que usa**: `ObtenerPerfil` recibe un repositorio; `RegistrarDeteccion`, seis. Los puertos de repositorio están separados por agregado (usuarios, gestos, acciones…), no en un "repositorio general".
- `RepositoriosTransaccionales` expone solo los cuatro repositorios que usan las operaciones de administración.

### D — Inversión de dependencias
*En simple: lo importante (las reglas) no depende de los detalles (base de datos, librerías); los detalles dependen de lo importante.*

- Los casos de uso dependen de **interfaces** (`DeteccionRepositorio`, `CifradorContrasenas`, `Reloj`), nunca de `pg`, `bcryptjs` o `Date.now()` directamente.
- Las interfaces las define **el núcleo**, según lo que necesita; los adaptadores las implementan. La flecha de dependencia apunta desde la infraestructura hacia el núcleo.
- Las dependencias entran **por el constructor** (backend) o por **inyección de Angular** (frontend), y se eligen en una sola raíz de composición.
- Incluso la hora es un puerto (`Reloj`): por eso se puede probar "la pausa de 1 segundo" o "cerrar la sesión con la hora de la última detección" sin esperar ni depender del reloj real.

---

## 7. Lo que cuesta (y por qué vale la pena)

Ser honestos con los costos también es parte de la arquitectura:

- **Más archivos y más indirección.** Para guardar una detección se pasa por controlador → caso de uso → puerto → adaptador. Para un CRUD de 3 tablas sería exagerado; aquí se justifica por la cámara, el modelo cambiante y el trabajo en paralelo.
- **Mantener los adaptadores en memoria.** Si se agrega una regla en un trigger, hay que imitarla en memoria. Las pruebas de contrato avisan cuando se olvida.
- **Algunas reglas están dos veces** (por ejemplo, "sesión cerrada" en el dominio y en el trigger). Es intencional, como defensa en profundidad: la base protege los datos aunque alguien los toque con pgAdmin, y el núcleo da mensajes claros sin depender de la base.

## 8. Preguntas que puede hacer el docente

**¿Dónde está el hexágono en el código?** En `backend/src`: `dominio/` y `aplicacion/` son el hexágono; `infraestructura/` son los adaptadores alrededor; `main.ts` los conecta.

**¿Qué pasa si cambian PostgreSQL por MySQL?** Se escriben adaptadores MySQL que cumplan los mismos puertos y se cambia una línea en `main.ts`. Ni el dominio ni los casos de uso se tocan; las pruebas de contrato confirman que el nuevo adaptador se comporta igual.

**¿Por qué los triggers no rompen la arquitectura?** La base es un detalle detrás de un adaptador. Los triggers optimizan y protegen los datos, pero el núcleo no depende de ellos: con el adaptador en memoria funciona igual.

**¿Dónde se ve la inversión de dependencias?** En que `RegistrarDeteccion` importa `DeteccionRepositorio` (una interface del núcleo) y no `DeteccionRepositorioPg`. La clase concreta solo aparece en `main.ts`.

**¿Cómo se prueban las reglas de aceptación sin cámara?** Son una clase pura que recibe resultados y una hora: la prueba le da "pulgar arriba con 90 % durante 480 ms" y comprueba que todavía no se acepte.
