# Bitácora de IA · API

| Fecha | Propósito | Evidencia | Validación | Decisión |
|---|---|---|---|---|
| 2026-11-20 | Generar la configuración de IA (reglas, guardia de seguridad, hook PreToolUse) | `ia/guard.mjs`, `.kiro/hooks/guardia-seguridad.json`, `.kiro/steering/reglas-proyecto.md` | `npm run test:ia`: 8 pruebas (bloqueo de `.env`/claves, bloqueo fuera de carpeta, permiso para push/deploy/red) | Aceptada. Se corrigió que las rutas absolutas con espacios (`Juan M`) se partían al analizarlas. |
| 2026-11-20 | Generar rutas de la API (auth mediada, lectura, proxy Open Library) | `src/app/api/**`, `src/lib/**` | `npm run check`: lint, tipos y 20 pruebas Vitest con Firebase simulado | Aceptada. Se añadió 502/504 para fallos del servicio externo. Los códigos listados en la guía no incluyen uno para ese caso. |
| 2026-11-20 | Generar pruebas (401, 400, aislamiento, rol admin, normalización del proxy) | `tests/**` | Pasan. Se revisó que la prueba de la clave privada use la función real y no el mock. | Aceptada |

## Pendiente de validar por el equipo
- Probar contra un proyecto real de Firebase (registro, login, refresh, sincronización).
- Configurar el Firewall de Vercel para limitar intentos de login.
- Demostrar en vivo el bloqueo del hook dentro del IDE (el script está probado, el comportamiento del IDE debe verse en la sustentación).
