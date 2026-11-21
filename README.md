# 27 · Buscador de libros · API

**Desplegada en:** https://27-buscador-de-libros-api.vercel.app (estado: `/api/health`)

API en Next.js (Route Handlers, runtime Node) con Firebase Auth + Firestore (solo Admin SDK), desplegable en Vercel. La app móvil está en el repositorio `27-buscador-de-libros-app`.

## Endpoints

| Ruta | Descripción |
|---|---|
| `GET /api/health` | Estado del servicio |
| `POST /api/auth/registro` · `login` · `refresh` · `GET /api/auth/yo` | Autenticación mediada por la API (Firebase Auth REST) |
| `GET /api/lectura?since=` · `PUT/DELETE /api/lectura/:id` | Sincronización de la lista de lectura (borrado lógico, máx. 500) |
| `GET /api/libros/buscar?q=&pagina=` · `GET /api/libros/isbn/:isbn` | Proxy a Open Library (timeout 5 s, solo campos usados) |
| `GET /api/libros/detalle/:id` | Sinopsis de una obra (extensión: la usa la vista previa por pulsación larga) |

Todas las rutas salvo `health` y `auth/*` exigen `Authorization: Bearer <ID token>`.
Errores: `{ "error": "...", "detalles"?: [...] }`. Fallos del servicio externo: 502/504.

## Variables de entorno (solo en Vercel; nunca en Git)

`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (con `\n` literales), `FIREBASE_WEB_API_KEY`. Plantilla en `.env.example`.

## Desarrollo

```bash
npm install
npm run dev        # usa .env.local (no versionado)
npm run check      # lint + tipos + Vitest + pruebas de la guardia de IA
```

## Puesta en marcha

1. Firebase: habilitar *Authentication → Email/Password*, crear Firestore en modo producción y publicar `firestore.rules` (`allow read, write: if false`). Crear una cuenta de servicio y copiar la clave de API web.
2. Vercel: importar este repositorio y cargar las 4 variables en *Settings → Environment Variables*.
3. Desplegar (`vercel deploy --prod` o push a `main`) y comprobar `GET https://<su-api>.vercel.app/api/health`.
4. Firewall de Vercel: regla de límite de tasa para `/api/auth/*`.

## Configuración de IA

Reglas en `AGENTS.md` y `.kiro/steering/`. Hook `PreToolUse` (`ia/guard.mjs`) que bloquea `.env*`/claves, bloquea rutas fuera del repo y pide permiso para acciones externas. Evidencia: `npm run test:ia`. Bitácora: `ia/BITACORA.md`.
Para activar el pre-commit: `git config core.hooksPath .githooks`.
