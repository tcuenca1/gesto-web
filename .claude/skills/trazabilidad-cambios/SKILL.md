---
name: trazabilidad-cambios
description: Cómo dejar cada cambio de GestoWeb trazable: un commit por cambio con Conventional Commits en español, referencia a requisitos de la SRS (RF, RNF, P-xx) o a observaciones de revisión (OBS-xx), documentación actualizada en el mismo commit y PR con tabla de trazabilidad. Usar al hacer commits, abrir un PR, registrar observaciones del docente o cerrar una tarea.
---

# Trazabilidad de cambios · GestoWeb

El objetivo: que el ingeniero pueda abrir el historial de Git y entender **qué se cambió, por qué y qué requisito cubre**, commit por commit.

## 1. Observaciones de revisión

Las observaciones del docente o de una auditoría se registran en `docs/observaciones.md` con un id estable:

```
| Id | Fecha | Origen | Observación | Estado | Commits |
|---|---|---|---|---|---|
| OBS-01 | 2026-11-08 | Ing. (revisión de avance) | Seguir la arquitectura hexagonal del proyecto de clase | En curso | abc1234, … |
```
Estados: `Pendiente`, `En curso`, `Resuelta`. Se actualiza en el último commit que la resuelve.

## 2. Commits

- **Un commit = un cambio con sentido propio** que compila y pasa las pruebas. Nunca se mezclan refactor y cambio visual.
- Formato Conventional Commits en español:
  ```
  <tipo>(<ámbito>): <qué cambia, en imperativo y minúscula>

  <por qué, 1-3 líneas>

  Refs: OBS-01, RNF-12
  ```
- Tipos: `feat`, `fix`, `refactor`, `style` (solo formato), `ui` (cambios visuales), `test`, `docs`, `chore` (configuración, dependencias, skills).
- Ámbitos: `backend`, `frontend`, `bd`, `docs`, `skills`, o el módulo (`usuario`, `historial`, …).
- Ejemplos:
  - `refactor(backend): convertir puertos de salida en clases PuertoSalida*`
  - `ui(frontend): reemplazar emojis por iconos de esqueleto de puntos`
  - `chore(skills): agregar skill de arquitectura hexagonal`
- Un refactor puramente de nombres o movimientos de archivos usa `git mv` para que Git conserve el historial del archivo.

## 3. Documentación en el mismo commit

| Si el cambio toca… | Actualizar |
|---|---|
| Estructura de carpetas o nombres | `README.md` (Estructura) y `docs/arquitectura-hexagonal-y-solid.md` |
| Endpoints | `docs/guia-tecnica.md` y `docs/GestoWeb.postman_collection.json` |
| Pantallas | `docs/manual-de-usuario.md` y las capturas de `docs/capturas/` (con `frontend/e2e/recorrido.mjs`) |
| Pruebas | Conteos en `README.md` y `docs/pruebas.md` |
| Observación | `docs/observaciones.md` |

## 4. Ramas y PR

- Rama por bloque de trabajo: `refactor/…`, `feat/…`, `ui/…`. Nunca commits directos en `main`.
- El PR lleva:
  1. Resumen en 2-3 líneas.
  2. Tabla de trazabilidad: `| Commit | Cambio | Refs |`.
  3. Cómo se verificó (comandos y resultado) y qué no se pudo verificar.
  4. Desviaciones de las skills, si hubo.
- Antes del push: `git log --oneline main..HEAD` para revisar que cada mensaje se entiende solo.
