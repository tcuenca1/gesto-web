---
name: pruebas-por-capa
description: Cómo escribir y ejecutar las pruebas de GestoWeb según la capa hexagonal (dominio, casos de uso con adaptadores en memoria, API con supertest, contrato PostgreSQL vs memoria, núcleo del frontend con Karma). Usar al agregar o cambiar cualquier regla, caso de uso, adaptador o endpoint, al refactorizar (para comprobar que no cambió el comportamiento) y antes de cada commit.
---

# Pruebas por capa · GestoWeb

Cada capa se prueba **sin la de afuera**. Así las pruebas son rápidas y demuestran la arquitectura (prueba de aceptación P-09).

## 1. Qué prueba va en cada capa

| Capa | Archivo | Qué se prueba | Con qué |
|---|---|---|---|
| Dominio | `backend/pruebas/dominio.prueba.ts` | Reglas puras: validaciones de `Usuario`, umbral de `Gesto`, rangos de `Estadisticas` | Nada: solo `new` y llamadas |
| Casos de uso | `backend/pruebas/casos-uso.prueba.ts` | Cada método de cada `CasoUso_<Modulo>Lectura|Escritura`: caso feliz + cada error que lanza | `entornoMemoria()` de `ayudantes.ts` (adaptadores en memoria, `RelojFalso`, bcrypt costo 4) |
| Adaptador de entrada + rutas | `backend/pruebas/http.prueba.ts` | Código HTTP, forma del JSON, token y rol (P-05), límites (413, 429) | `supertest` sobre `crearApp(contenedoresMemoria)` |
| Adaptadores de salida | `backend/pruebas/postgres/contrato.prueba.ts` | **Las mismas aserciones** contra `AdapSalida_*Postgres` y `AdapSalida_*Memoria` | `npm run test:pg` (base `gestoweb_pruebas`) |
| Base de datos | `backend/pruebas/postgres/base-datos.prueba.ts` | Triggers, funciones y vistas (P-06, P-07) | PostgreSQL real |
| Núcleo frontend | `frontend/src/app/nucleo/**/*.spec.ts` | Reglas de aceptación, motor, cola, ejecutor | Adaptadores simulados; sin `HttpClient` ni cámara |

## 2. Reglas

1. **Nombre de la prueba = comportamiento en español**, empezando por la pieza: `'CasoUso_UsuarioEscritura.registrarUsuario rechaza un correo repetido'`.
2. **Una regla nueva → al menos una prueba que falla sin ella.** Un error nuevo (`ErrorConflicto`, etc.) → prueba que lo espera con `rejects.toMatchObject({ tipo: 'CONFLICTO' })`.
3. **Un método nuevo en un puerto de salida → se agrega al contrato** (`contrato.prueba.ts`) para que Postgres y Memoria se comporten igual.
4. **El tiempo se controla con `RelojFalso`**, nunca con `setTimeout` ni `Date.now()` en la prueba.
5. Las pruebas no dependen del orden ni comparten estado: cada `it` crea su `entornoMemoria()`.
6. Los ayudantes (`ayudantes.ts`) arman el sistema **igual que el contenedor**: si cambia `contenedor/`, se actualiza `entornoMemoria()` en el mismo commit.
7. **En un refactor no se cambian aserciones**, solo cómo se llama a la pieza (nombre de clase o método). Si una aserción tiene que cambiar, el refactor alteró el comportamiento y se reporta.
8. Se mantiene la cobertura del núcleo (dominio + aplicación) en 85 % de líneas o más (`npm run test:cobertura`).

## 3. Plantilla

```ts
describe('CasoUso_AccionEscritura', () => {
  it('cambiarAsignacion rechaza una acción inactiva', async () => {
    const { contenedores, almacen } = entornoMemoria();
    const idUsuario = await registrar(contenedores);
    almacen.acciones[0].activa = false;

    await expect(
      contenedores.accion.cuEscritura.cambiarAsignacion({ idUsuario, idGesto: 1, idAccion: almacen.acciones[0].id }),
    ).rejects.toMatchObject({ tipo: 'VALIDACION' });
  });
});
```

## 4. Antes de cada commit

```bash
cd backend && npm run typecheck && npm test
cd frontend && npm test            # si se tocó el frontend
cd frontend && npm run build       # si se tocaron estilos, plantillas o angular.json
```
`npm run test:pg` solo si se tocó SQL o un `AdapSalida_*Postgres` y hay PostgreSQL disponible; si no se pudo ejecutar, se dice en el mensaje del commit o del PR.

Al final, actualizar los conteos de pruebas en `README.md` y `docs/pruebas.md` si cambiaron.
