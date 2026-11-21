# 27 · Buscador de libros · API

[![CI](https://github.com/Raixu1/27-buscador-de-libros-api/actions/workflows/ci.yml/badge.svg)](https://github.com/Raixu1/27-buscador-de-libros-api/actions/workflows/ci.yml)

**Desplegada en:** https://27-buscador-de-libros-api.vercel.app (estado: `/api/health`)

API en Next.js (Route Handlers, runtime Node) con Firebase Auth + Firestore (solo Admin SDK), desplegable en Vercel. La app móvil está en el repositorio `27-buscador-de-libros-app`.

## Endpoints

| Ruta                                                                 | Descripción                                                                  |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `GET /api/health`                                                    | Estado del servicio                                                          |
| `POST /api/auth/registro` · `login` · `refresh` · `GET /api/auth/yo` | Autenticación mediada por la API (Firebase Auth REST)                        |
| `GET /api/lectura?since=` · `PUT/DELETE /api/lectura/:id`            | Sincronización de la lista de lectura (borrado lógico, máx. 500)             |
| `GET /api/libros/buscar?q=&pagina=` · `GET /api/libros/isbn/:isbn`   | Proxy a Open Library (timeout 5 s, solo campos usados)                       |
| `GET /api/libros/detalle/:id`                                        | Sinopsis de una obra (extensión: la usa la vista previa por pulsación larga) |

Todas las rutas salvo `health` y `auth/*` exigen `Authorization: Bearer <ID token>`.
Errores: `{ "error": "...", "detalles"?: [...] }`. Fallos del servicio externo: 502/504.

## Variables de entorno (solo en Vercel; nunca en Git)

`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (con `\n` literales), `FIREBASE_WEB_API_KEY`. Plantilla en `env.example`.

## Desarrollo

```bash
npm install
npm run dev        # usa .env.local (no versionado)
npm run check      # tipos + lint + formato + pruebas con cobertura ≥ 80 % + guardia de IA
```

## Puesta en marcha

1. Firebase: habilitar _Authentication → Email/Password_, crear Firestore en modo producción y publicar `firestore.rules` (`allow read, write: if false`). Crear una cuenta de servicio y copiar la clave de API web.
2. Vercel: importar este repositorio y cargar las 4 variables en _Settings → Environment Variables_.
3. Desplegar (`vercel deploy --prod` o push a `main`) y comprobar `GET https://<su-api>.vercel.app/api/health`.
4. Firewall de Vercel: regla de límite de tasa para `/api/auth/*`.

## Configuración de IA

Reglas en `AGENTS.md` y `.kiro/steering/`. Hook `PreToolUse` (`ia/guard.mjs`) que bloquea `.env*`/claves, bloquea rutas fuera del repo y pide permiso para acciones externas. Evidencia: `npm run test:ia`. Bitácora: `ia/BITACORA.md`.
Hooks de Git con Husky: al hacer commit, `lint-staged` formatea y revisa lo modificado; al hacer push corre `npm run check`. Se activan solos con `npm install`.

## Dependencias (por qué está cada una)

`package-lock.json` está versionado y la CI instala con `npm ci` (versiones exactas).

| Paquete                            | Para qué                                                       | Por qué esta y no otra                                                                              |
| ---------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `next`, `react`, `react-dom`       | Route Handlers de la API y despliegue en Vercel                | Lo exige la arquitectura del proyecto; `react` y `react-dom` son dependencias obligatorias de Next. |
| `firebase-admin`                   | Verificar ID tokens y acceder a Firestore                      | SDK oficial; es la única vía de acceso a Firestore (las reglas niegan a los clientes).              |
| `zod`                              | Validar cuerpos, parámetros y respuestas externas              | Lo pide la guía; además da tipos a partir del esquema (sin `as`).                                   |
| `typescript`, `@types/*`           | Tipado estricto                                                | Requisito de calidad (strict + noUncheckedIndexedAccess).                                           |
| `vitest`, `@vitest/coverage-v8`    | Pruebas y cobertura (umbral 80 %)                              | Lo pide la guía; v8 mide la cobertura sin instrumentar el código.                                   |
| `eslint` (9), `eslint-config-next` | Reglas de calidad                                              | Config oficial de Next. ESLint 9 porque sus plugins aún no soportan ESLint 10.                      |
| `prettier`                         | Formato uniforme (`format:check`)                              | Requisito de calidad.                                                                               |
| `husky`, `lint-staged`             | Hooks: formato y lint en el commit, `npm run check` en el push | Requisito de proceso; lint-staged solo revisa lo modificado.                                        |

**Override:** `jwks-rsa` usa `jose` 5 (`overrides` en `package.json`). `jose` 6 solo existe como módulo ES y Vercel no permite `require()` de ESM: sin esto, todas las rutas con Firebase respondían 500.
