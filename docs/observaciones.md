# Observaciones de revisión

Registro de las observaciones recibidas sobre el proyecto y de los commits que las resuelven. El formato se explica en `.claude/skills/trazabilidad-cambios/SKILL.md`.

| Id | Fecha | Origen | Observación | Estado | Commits |
|---|---|---|---|---|---|
| OBS-01 | 2026-11-08 | Ingeniero (revisión de avance) | Seguir la arquitectura hexagonal con la forma y la nomenclatura del proyecto de clase, y dejarla definida en una skill | Resuelta | f85f880, 563e125, 945353b, ff676d0, b01b569, f6a32d1, 794a913, f7812bd, bfffff2, 50554e4, 2fd4194, 6207570, 6832036, 9ecd999 |
| OBS-02 | 2026-11-08 | Ingeniero (revisión de avance) | La interfaz se ve genérica, "hecha por IA"; definir un estilo propio en una skill | Resuelta | 33b379e, b01b569, 46748d7, 09293df, a338a4b, 44620b8, 13dda4d, d7e3101, 328e430, 8f1f27f, fadb53a, 7c97718, 0e89303 |

## Cómo se verificó

- **OBS-01:** auditoría de la skill `arquitectura-hexagonal` (§10) sin infracciones (solo la excepción aceptada de `errores.ts`); backend 51/51 pruebas, `typecheck` y build de producción; frontend 17/17 pruebas. No se pudo ejecutar `npm run test:pg` (sin PostgreSQL en la máquina de trabajo).
- **OBS-02:** lista de verificación de la skill `interfaz-gestoweb` (§9): 0 emojis, 0 colores literales fuera de `styles.scss`, 0 radios de 3 px o más, 0 sombras. Recorrido de extremo a extremo `frontend/e2e/recorrido.mjs` con 14/14 comprobaciones y capturas regeneradas.
