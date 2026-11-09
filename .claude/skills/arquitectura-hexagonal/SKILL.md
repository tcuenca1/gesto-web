---
name: arquitectura-hexagonal
description: Reglas de arquitectura hexagonal de GestoWeb con la nomenclatura del proyecto de clase de Programación Web (PuertoEntrada/PuertoSalida, CasoUso_<Modulo>Lectura/Escritura, AdapEntrada_/AdapSalida_, contenedor/). Usar SIEMPRE antes de crear, mover o revisar código del backend (Express + TypeScript) o del núcleo del frontend (Angular), al agregar un endpoint, caso de uso, repositorio, adaptador o servicio externo, y al auditar si el proyecto respeta la arquitectura.
---

# Arquitectura hexagonal · GestoWeb

GestoWeb sigue la arquitectura hexagonal **con la misma forma y el mismo vocabulario del proyecto de clase `ProgramacionWeb`**, adaptados a TypeScript. Quien conozca el proyecto de clase tiene que reconocer cada pieza solo por su nombre y su carpeta.

> Regla de oro: **las dependencias apuntan hacia adentro.**
> `infraestructura → aplicacion → dominio`. El dominio no importa nada externo. La aplicación solo importa dominio y sus propios puertos. Solo `contenedor/` conoce a la vez los adaptadores concretos y los casos de uso.

---

## 1. Reglas obligatorias

1. **Nomenclatura del proyecto de clase** (sección 3). Ningún archivo nuevo usa `Repositorio`, `Servicio`, `Controlador`, `rutas*` ni `*Pg` como nombre de pieza arquitectónica.
2. **Una clase por archivo, y el archivo se llama igual que la clase** (`AdapSalida_UsuarioPostgres.ts` exporta `class AdapSalida_UsuarioPostgres`). Sin `export default`.
3. **Los puertos son clases abstractas** (`export abstract class PuertoSalidaUsuario`) con métodos `abstract`. Los casos de uso y los adaptadores hacen `extends` y llaman `super()`. Es la versión tipada del `throw new Error("Debes implementar …")` del proyecto de clase.
4. **Lectura y escritura separadas:** cada módulo tiene `CasoUso_<Modulo>Lectura` (consultas sin efectos) y/o `CasoUso_<Modulo>Escritura` (todo lo que cambia estado, incluido registrar el último acceso).
5. **Inyección manual por constructor.** Los casos de uso reciben puertos de salida; los adaptadores de entrada reciben puertos de entrada. Nadie hace `new` de un adaptador fuera de `contenedor/`.
6. **El adaptador de entrada es el único que toca `req`/`res`.** No valida reglas de negocio ni convierte tipos de dominio: pasa los datos crudos al caso de uso (los ids llegan como `string` y el caso de uso los valida).
7. **El dominio lanza `ErrorDominio`** (`ErrorValidacion`, `ErrorNoEncontrado`, …). El único que traduce a HTTP es `manejadorErrores` (sección 6).
8. **`app.ts` solo enruta:** una línea por endpoint que delega en `contenedor.<modulo>.adap.<metodo>`. Nada de `Router()` separados.
9. **Desviaciones:** si algo no puede seguir estas reglas, se reporta con el formato de la sección 9. Las desviaciones ya aceptadas están en la sección 8.

---

## 2. Árbol objetivo (backend)

```
backend/src/
├── main.ts                                # arranque: lee entorno, crea contenedores, app.listen, apagado limpio
├── app.ts                                 # crearApp(contenedores): middlewares + 1 línea por ruta
├── contenedor/
│   ├── ContenedorPersistencia.ts          # crearPersistenciaPostgres(pool) / crearPersistenciaMemoria(reloj)
│   ├── ContenedorUsuario.ts               # crearContenedorUsuario(p) → { cuLectura, cuEscritura, adap }
│   ├── ContenedorReconocimiento.ts
│   ├── ContenedorAccion.ts
│   ├── ContenedorHistorial.ts
│   ├── ContenedorAdministracion.ts
│   └── index.ts                           # crearContenedores(config, pool?) → { usuario, reconocimiento, … }
├── dominio/                               # entidades y reglas puras (sin imports externos)
│   ├── compartido/errores.ts
│   ├── usuario/Usuario.ts
│   ├── gesto/Gesto.ts
│   ├── accion/Accion.ts · accion/Asignacion.ts
│   └── deteccion/Deteccion.ts · SesionReconocimiento.ts · Estadisticas.ts
├── aplicacion/
│   ├── dto/
│   │   ├── DtoUsuario.ts                  # interfaces de entrada/salida del módulo (DtoRegistroUsuario, …)
│   │   ├── RespuestaUsuario.ts            # usuarioARespuesta(): nunca expone contrasenaHash
│   │   └── …  (uno por módulo)
│   ├── puerto/
│   │   ├── entrada/
│   │   │   ├── PuertoEntradaUsuarioLectura.ts
│   │   │   ├── PuertoEntradaUsuarioEscritura.ts
│   │   │   └── …
│   │   └── salida/
│   │       ├── PuertoSalidaUsuario.ts     # crear, buscarPorId, buscarPorCorreo, listar, actualizar, contar
│   │       ├── PuertoSalidaGesto.ts · PuertoSalidaAccion.ts · PuertoSalidaAsignacion.ts
│   │       ├── PuertoSalidaSesion.ts · PuertoSalidaDeteccion.ts · PuertoSalidaBitacora.ts
│   │       ├── PuertoSalidaUnidadDeTrabajo.ts
│   │       └── PuertoSalidaCifrador.ts · PuertoSalidaTokens.ts · PuertoSalidaReloj.ts
│   └── caso_uso/
│       ├── comun.ts                       # leerEnteroPositivo, leerRango, leerPaginacion (solo los usan casos de uso)
│       ├── lectura/
│       │   ├── CasoUso_UsuarioLectura.ts
│       │   ├── CasoUso_AccionLectura.ts
│       │   ├── CasoUso_HistorialLectura.ts
│       │   └── CasoUso_AdministracionLectura.ts
│       └── escritura/
│           ├── CasoUso_UsuarioEscritura.ts
│           ├── CasoUso_ReconocimientoEscritura.ts
│           ├── CasoUso_AccionEscritura.ts
│           └── CasoUso_AdministracionEscritura.ts
└── infraestructura/
    ├── adaptadores/
    │   ├── entrada/
    │   │   ├── AdapEntrada_UsuarioWeb.ts
    │   │   ├── AdapEntrada_ReconocimientoWeb.ts
    │   │   ├── AdapEntrada_AccionWeb.ts
    │   │   ├── AdapEntrada_HistorialWeb.ts
    │   │   └── AdapEntrada_AdministracionWeb.ts
    │   └── salida/
    │       ├── AdapSalida_UsuarioPostgres.ts   · AdapSalida_UsuarioMemoria.ts
    │       ├── AdapSalida_GestoPostgres.ts     · AdapSalida_GestoMemoria.ts
    │       ├── … (una pareja Postgres/Memoria por puerto de persistencia)
    │       ├── AdapSalida_UnidadDeTrabajoPostgres.ts · AdapSalida_UnidadDeTrabajoMemoria.ts
    │       ├── AdapSalida_CifradorBcrypt.ts
    │       ├── AdapSalida_TokensJwt.ts
    │       └── AdapSalida_RelojSistema.ts
    ├── base_dato/
    │   ├── ConexionPostgresql.ts          # crearPool()
    │   ├── AlmacenMemoria.ts
    │   └── datosInicialesMemoria.ts
    └── util/
        ├── entorno.ts                     # leerConfiguracion() (dotenv)
        └── middlewares.ts                 # manejar, autenticacion, exigirRol, limitarIntentos, cabecerasSeguridad, manejadorErrores
```

Los scripts SQL siguen en `base-datos/` (raíz del repo) y los scripts de npm en `backend/scripts/`.

---

## 3. Nomenclatura

| Pieza | Carpeta | Nombre | Ejemplo |
|---|---|---|---|
| Entidad | `dominio/<modulo>/` | Sustantivo singular | `Usuario`, `Gesto` |
| DTO | `aplicacion/dto/` | `Dto<Modulo>.ts` con interfaces `Dto<Accion><Modulo>` | `DtoRegistroUsuario` |
| Conversión a respuesta | `aplicacion/dto/` | `Respuesta<Modulo>.ts` → `<modulo>ARespuesta()` | `usuarioARespuesta` |
| Puerto de entrada | `aplicacion/puerto/entrada/` | `PuertoEntrada<Modulo>Lectura` / `…Escritura` | `PuertoEntradaUsuarioEscritura` |
| Puerto de salida | `aplicacion/puerto/salida/` | `PuertoSalida<Recurso>` | `PuertoSalidaDeteccion` |
| Caso de uso | `aplicacion/caso_uso/lectura|escritura/` | `CasoUso_<Modulo>Lectura` / `…Escritura` | `CasoUso_HistorialLectura` |
| Adaptador de entrada | `infraestructura/adaptadores/entrada/` | `AdapEntrada_<Modulo>Web` | `AdapEntrada_AccionWeb` |
| Adaptador de salida | `infraestructura/adaptadores/salida/` | `AdapSalida_<Recurso><Tecnologia>` | `AdapSalida_UsuarioPostgres` |
| Conexión | `infraestructura/base_dato/` | `Conexion<Motor>` | `ConexionPostgresql` |
| Contenedor | `contenedor/` | `Contenedor<Modulo>.ts` → `crearContenedor<Modulo>()` | `crearContenedorHistorial` |

- Identificadores en español, sin tildes ni ñ (`contrasena`, `fechaHora`). Mensajes al usuario sí con tildes.
- Métodos de casos de uso con verbo en infinitivo: `registrarUsuario`, `consultarHistorial`, `cambiarAsignacion`.
- Métodos del adaptador de entrada con el mismo verbo que el caso de uso que llama: `registrarUsuario(req, res)`.
- Módulos actuales: `Usuario`, `Reconocimiento`, `Accion` (catálogos y asignaciones), `Historial`, `Administracion`.

---

## 4. Plantillas

### 4.1 Puerto de salida
```ts
// aplicacion/puerto/salida/PuertoSalidaUsuario.ts
import { NuevoUsuario, Usuario } from '../../../dominio/usuario/Usuario';

export abstract class PuertoSalidaUsuario {
  abstract crear(nuevo: NuevoUsuario): Promise<Usuario>;
  abstract buscarPorCorreo(correo: string): Promise<Usuario | null>;
  // …
}
```

### 4.2 Puerto de entrada y caso de uso
```ts
// aplicacion/puerto/entrada/PuertoEntradaUsuarioEscritura.ts
export abstract class PuertoEntradaUsuarioEscritura {
  abstract registrarUsuario(dto: DtoRegistroUsuario): Promise<DtoUsuarioPublico>;
  abstract iniciarSesion(dto: DtoInicioSesion): Promise<DtoResultadoInicioSesion>;
}

// aplicacion/caso_uso/escritura/CasoUso_UsuarioEscritura.ts
export class CasoUso_UsuarioEscritura extends PuertoEntradaUsuarioEscritura {
  constructor(
    private readonly adapSalidaUsuario: PuertoSalidaUsuario,
    private readonly adapSalidaCifrador: PuertoSalidaCifrador,
  ) {
    super();
  }

  async registrarUsuario(dto: DtoRegistroUsuario): Promise<DtoUsuarioPublico> {
    const nombre = Usuario.validarNombre(dto.nombre);          // regla en el dominio
    // …
    return usuarioARespuesta(usuario);                         // nunca devuelve la entidad
  }
}
```

### 4.3 Adaptador de entrada
```ts
// infraestructura/adaptadores/entrada/AdapEntrada_UsuarioWeb.ts
import { Request, Response } from 'express';

export class AdapEntrada_UsuarioWeb {
  constructor(
    private readonly cuLectura: PuertoEntradaUsuarioLectura,
    private readonly cuEscritura: PuertoEntradaUsuarioEscritura,
  ) {}

  async registrarUsuario(req: Request, res: Response): Promise<void> {
    const { nombre, correo, contrasena } = req.body ?? {};
    res.status(201).json(await this.cuEscritura.registrarUsuario({ nombre, correo, contrasena }));
  }
}
```
Sin `try/catch`: los errores suben a `manejar()` → `manejadorErrores` (desviación aceptada D-05).

### 4.4 Contenedor
```ts
// contenedor/ContenedorUsuario.ts
export function crearContenedorUsuario(p: Persistencia, s: Servicios) {
  const cuLectura = new CasoUso_UsuarioLectura(p.usuarios, s.tokens);
  const cuEscritura = new CasoUso_UsuarioEscritura(p.usuarios, s.cifrador, s.tokens, s.reloj);
  const adap = new AdapEntrada_UsuarioWeb(cuLectura, cuEscritura);
  return { cuLectura, cuEscritura, adap };
}
```

### 4.5 Ruta en `app.ts`
```ts
app.post('/api/auth/registro', limitar, manejar((req, res) => c.usuario.adap.registrarUsuario(req, res)));
app.get('/api/historial', conToken, manejar((req, res) => c.historial.adap.consultarHistorial(req, res)));
```
Las rutas se agrupan con comentarios por módulo y mantienen **exactamente** las URLs del contrato de la API (SRS §8.2). Cambiar una URL rompe el frontend y la colección de Postman.

---

## 5. Receta: agregar una funcionalidad

De adentro hacia afuera, un paso por capa:

1. **Dominio:** regla o entidad nueva en `dominio/<modulo>/` (sin imports externos).
2. **DTO:** interfaces en `aplicacion/dto/Dto<Modulo>.ts`; conversión en `Respuesta<Modulo>.ts` si oculta campos.
3. **Puerto de salida:** método `abstract` nuevo en `PuertoSalida<Recurso>`.
4. **Puerto de entrada:** método `abstract` en `PuertoEntrada<Modulo>Lectura|Escritura`.
5. **Caso de uso:** implementación en `CasoUso_<Modulo>Lectura|Escritura`.
6. **Adaptadores de salida:** implementar el método en **los dos**: `AdapSalida_<Recurso>Postgres` y `AdapSalida_<Recurso>Memoria` (si falta el de memoria, las pruebas sin base de datos y la prueba P-09 se rompen).
7. **SQL:** tabla, función o vista en `base-datos/0X_*.sql`.
8. **Adaptador de entrada:** método en `AdapEntrada_<Modulo>Web`.
9. **Contenedor:** solo si hay una dependencia nueva.
10. **Ruta:** una línea en `app.ts`.
11. **Frontend:** método en el puerto `ApiGestoWeb` → adaptador HTTP → página (sección 7).
12. **Pruebas y documentación:** ver las skills `pruebas-por-capa` y `trazabilidad-cambios`.

---

## 6. Errores y respuestas HTTP

- El núcleo lanza `ErrorValidacion`, `ErrorNoAutenticado`, `ErrorProhibido`, `ErrorNoEncontrado` o `ErrorConflicto(mensaje, codigo?)`.
- `manejadorErrores` (en `infraestructura/util/middlewares.ts`) es el **único** lugar con la tabla tipo → código HTTP: 400 / 401 / 403 / 404 / 409, y 500 para lo inesperado.
- Formato de error: `{ "error": { "codigo": "…", "mensaje": "…" } }`. Respuestas exitosas: el DTO tal cual (201 al crear).
- Nunca se devuelve una entidad del dominio ni `contrasenaHash`: siempre pasa por `<modulo>ARespuesta()`.

---

## 7. Frontend (Angular)

Mismo vocabulario dentro de `frontend/src/app/`:

```
nucleo/
├── dominio/                 gesto.ts, modelos.ts (tipos y reglas puras)
├── puerto/salida/           PuertoSalidaApiGestoWeb, PuertoSalidaCamara, PuertoSalidaReconocedor (abstract class = token de DI)
└── caso_uso/                CasoUso_MotorReconocimiento, CasoUso_ReglasAceptacion, CasoUso_ColaDetecciones, CasoUso_EjecutorAcciones
adaptadores/salida/          AdapSalida_ApiHttp, AdapSalida_CamaraNavegador, AdapSalida_ReconocedorMediaPipe, AdapSalida_CamaraSimulada, AdapSalida_ReconocedorSimulado
paginas/                     adaptadores de entrada (la interfaz): solo inyectan puertos o casos de uso del núcleo
compartido/                  guards, sesión, avisos, componentes visuales
app.config.ts                raíz de composición: { provide: PuertoSalidaCamara, useClass: AdapSalida_CamaraNavegador }
```

- Los archivos siguen la convención de Angular en kebab-case (`adap-salida-camara-navegador.ts`) y las clases usan el nombre del proyecto de clase (desviación aceptada D-07).
- **Una página nunca importa nada de `adaptadores/`** ni usa `HttpClient`. Solo `app.config.ts` conoce los adaptadores.
- Una clase por archivo (los adaptadores simulados también van por separado).

---

## 8. Desviaciones aceptadas respecto al proyecto de clase

Están justificadas por la SRS de GestoWeb y no hace falta volver a reportarlas:

| # | Desviación | Motivo |
|---|---|---|
| D-01 | TypeScript en lugar de JS | Tipos en los contratos (puertos), exigido por el stack de la SRS |
| D-02 | `pg` con SQL parametrizado, sin ORM | Triggers, vistas y funciones en `base-datos/` hacen el trabajo pesado (SRS §9) |
| D-03 | Adaptadores en memoria en vez de MongoDB | Permiten probar sin base de datos (prueba P-09) |
| D-04 | bcrypt + JWT | Contraseñas cifradas y sesión sin estado (RNF-07) |
| D-05 | Errores centralizados en `manejadorErrores` en vez de `try/catch` en cada adaptador | Una sola tabla de códigos HTTP; evita repetir la traducción 30 veces |
| D-06 | Jest + supertest y Karma | Las pruebas automáticas son parte de la entrega |
| D-07 | Angular en lugar de React, con archivos en kebab-case | Stack de la SRS y convención del framework |
| D-08 | `dotenv` | Despliegue con variables de entorno (Render/Railway) |
| D-09 | Rutas `/api/...` en lugar de `/6A/...` | Contrato de la API acordado en la SRS §8.2 |

---

## 9. Formato para reportar una desviación nueva

```
⚠️ DESVIACIÓN #n
- Qué: <qué se hizo distinto a esta skill>
- Dónde: <archivo(s)>
- Por qué era necesario: <razón ligada a la SRS o a una limitación técnica>
- Alternativa fiel descartada: <qué se habría hecho siguiendo la skill y por qué no alcanzaba>
```
Si no hubo: `Sin desviaciones: el cambio sigue la skill arquitectura-hexagonal.`

---

## 10. Auditoría rápida (ejecutar desde la raíz del repo)

```bash
# 1. El dominio no importa nada fuera de dominio/
grep -rnE "from '(\.\./)+(aplicacion|infraestructura|contenedor)|from '(express|pg|bcryptjs|jsonwebtoken|dotenv)'" backend/src/dominio

# 2. La aplicación no importa infraestructura, contenedor ni librerías externas
grep -rnE "from '(\.\./)+(infraestructura|contenedor)|from '(express|pg|bcryptjs|jsonwebtoken|dotenv)'" backend/src/aplicacion

# 3. La infraestructura no usa piezas internas de los casos de uso (solo puertos y DTO)
grep -rn "caso_uso/" backend/src/infraestructura

# 4. Nombres prohibidos en piezas nuevas
grep -rlnE "class \w*(Repositorio|Servicio|Controlador)\b|Router\(\)" backend/src

# 5. Una clase por archivo
for f in $(find backend/src -name '*.ts'); do n=$(grep -c '^export \(abstract \)\?class' "$f"); [ "$n" -gt 1 ] && echo "$f: $n clases"; done

# 6. Páginas del frontend que importan adaptadores o HttpClient
grep -rlnE "adaptadores/|HttpClient" frontend/src/app/paginas
```
Cada línea que imprima un comando es una infracción. Después:

```bash
cd backend && npm run typecheck && npm test
cd frontend && npm test && npm run build
```

## 11. Al terminar un cambio, informar

- Capas tocadas y archivos (nuevos, movidos o modificados).
- Flujo: `ruta → AdapEntrada_… → CasoUso_… → PuertoSalida… → AdapSalida_…`.
- Resultado de la auditoría (sección 10) y de las pruebas.
- Desviaciones (sección 9).
