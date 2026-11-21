# Reglas del proyecto para la IA · 27-buscador-de-libros-api

## Stack
Next.js (App Router, Route Handlers, `runtime = "nodejs"`) · TypeScript estricto · `firebase-admin` · `zod` · Vitest. Despliegue en Vercel.

## Comandos
- `npm run dev` · `npm run build`
- `npm run lint` · `npm run typecheck` · `npm test` · `npm run test:ia`
- `npm run check` ejecuta todo lo anterior. Debe pasar antes de cada commit.

## Estructura
- `src/app/api/**/route.ts`: solo rutas finas. Envuelven con `route()` de `src/lib/errors.ts`.
- `src/lib/`: lógica (auth, Firestore, Open Library, ISBN, rate limit).
- `tests/`: Vitest con Firebase simulado (`tests/helpers/fakeFirebase.ts`).
- `ia/`: guardia de seguridad (`guard.mjs`), sus pruebas y la bitácora.

## Sí
- Validar toda entrada con Zod; guardar solo campos declarados.
- Sacar el `uid` únicamente de `verifyIdToken`. Datos privados en `usuarios/{uid}/...`.
- Errores `{ "error", "detalles"? }`; los internos responden `500 Error interno` sin detalles.
- Campos en `snake_case`, fechas ISO 8601 UTC, `null` en vez de `undefined`.
- Si cambia una ruta o regla, agregar o actualizar su prueba.

## No
- No leer, imprimir, copiar ni crear `.env*`, claves, keystores ni credenciales (solo `.env.example`).
- No salir de la carpeta de este repositorio.
- No registrar contraseñas, tokens ni datos personales en logs.
- No usar `any`, `console.log` ni `@ts-ignore`.
- No ejecutar `git push`, `vercel`, `npm publish`, `curl` ni similares sin permiso explícito del usuario.
- No agregar funciones fuera de los requisitos sin pedirlo.
