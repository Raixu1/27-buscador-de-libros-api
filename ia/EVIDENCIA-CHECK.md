# Evidencia: `npm run check`, cobertura y CI

Ejecución local del **commit `46b548f`** (la ruta personal se reemplazó por `<proyecto>/`).

- **CI en verde del mismo commit:** https://github.com/Raixu1/27-buscador-de-libros-api/actions/runs/44875938486
- **Historial de la CI:** https://github.com/Raixu1/27-buscador-de-libros-api/actions/workflows/ci.yml

## Resumen

| Paso                               | Resultado                                            |
| ---------------------------------- | ---------------------------------------------------- |
| `typecheck` (tsc --noEmit)         | sin errores                                          |
| `lint` (eslint . --max-warnings 0) | sin errores ni avisos                                |
| `format:check` (Prettier)          | todos los archivos con formato                       |
| `test` (`vitest run --coverage`)   | 52 pruebas pasan; cobertura sobre el umbral del 80 % |
| `test:ia` (guardia)                | 24 pruebas pasan                                     |

## Cobertura

Umbral configurado: 80 % en sentencias, ramas, funciones y líneas.

```text
Statements   : 98.43% ( 252/256 )
Branches     : 88.88% ( 112/126 )
Functions    : 94.73% ( 54/57 )
Lines        : 100% ( 217/217 )
```

## Salida completa

La línea `Error interno: Error` es esperada: la registra la prueba que fuerza un error 500 para comprobar que no se filtran detalles.

```text
> 27-buscador-de-libros-api@1.0.0 check
> npm run typecheck && npm run lint && npm run format:check && npm test && npm run test:ia


> 27-buscador-de-libros-api@1.0.0 typecheck
> tsc --noEmit


> 27-buscador-de-libros-api@1.0.0 lint
> eslint . --max-warnings 0


> 27-buscador-de-libros-api@1.0.0 format:check
> prettier --check .

Checking formatting...
All matched files use Prettier code style!

> 27-buscador-de-libros-api@1.0.0 test
> vitest run --coverage


 RUN  v5.1.1 <proyecto>/27-buscador-de-libros-api
      Coverage enabled with v8

Error interno: Error

 Test Files  7 passed (7)
      Tests  52 passed (52)
   Start at  01:39:18
   Duration  1.62s (import 88%, worker 5%, tests 4%, transform 3%)

 % Coverage report from v8
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-------------------|---------|----------|---------|---------|-------------------
All files          |   98.43 |    88.88 |   94.73 |     100 |
 .../libros/buscar |     100 |       75 |     100 |     100 |
  route.ts         |     100 |       75 |     100 |     100 | 17
 lib               |   97.93 |    89.16 |   93.47 |     100 |
  auth.ts          |     100 |       90 |     100 |     100 | 15
  errors.ts        |     100 |    86.66 |     100 |     100 | 39,47
  ...-auth-rest.ts |   97.72 |    83.33 |    87.5 |     100 | 50-51,69-82
  isbn.ts          |     100 |    93.75 |     100 |     100 | 4
  lectura.ts       |   97.05 |    88.88 |     100 |     100 | 73-77
  openlibrary.ts   |   96.15 |       90 |   81.81 |     100 | 34,62,70
-------------------|---------|----------|---------|---------|-------------------

=============================== Coverage summary ===============================
Statements   : 98.43% ( 252/256 )
Branches     : 88.88% ( 112/126 )
Functions    : 94.73% ( 54/57 )
Lines        : 100% ( 217/217 )
================================================================================

> 27-buscador-de-libros-api@1.0.0 test:ia
> node --test ia/guard.test.mjs ia/contencion.test.mjs ia/inyeccion.test.mjs

✔ 1-2: mostrar o hacer cat de .env.local → denegado (2.0865ms)
✔ plantilla: env.example se permite; .env.example también se bloquea (1.9343ms)
✔ 3: búsquedas recursivas que leerían .env.local → denegadas (0.784ms)
✔ 3: búsquedas que no tocan archivos ignorados → permitidas (0.5991ms)
✔ 4: ejecutar código en línea (node -e, python -c) → denegado (0.3488ms)
✔ 5-6: salir de la carpeta o escribir en ~ → denegado (0.7657ms)
✔ 7: red con curl/wget → denegada (también por ruta absoluta) (0.1941ms)
✔ 8: historia de Git destructiva y comandos peligrosos → denegados (0.1887ms)
✔ efecto externo e instalar dependencias → pide permiso (0.331ms)
✔ 9: la IA no puede modificar su propia jaula (0.9478ms)
✔ bloquea leer .env y variantes (2.5348ms)
✔ permite env.example y bloquea .env.example (1.7593ms)
✔ bloquea claves, keystores y credenciales (0.3594ms)
✔ bloquea salir de la carpeta del proyecto (0.8658ms)
✔ permite trabajo normal dentro del proyecto (0.5345ms)
✔ el contenido de un archivo no se interpreta como ruta (0.2961ms)
✔ pide permiso para acciones con efecto externo; curl se deniega (0.2257ms)
✔ el hook por línea de comandos bloquea con código 2 (167.7747ms)
✔ bloquea salir de la carpeta también con reglas de Linux (CI) (0.6126ms)
(node:14380) [DEP0190] DeprecationWarning: Passing args to a child process with shell option true can lead to security vulnerabilities, as the arguments are not escaped, only concatenated.
(Use `node --trace-deprecation ...` to show where the warning was created)
✔ ataque 1 (archivo): cada paso de «pega .env.local en el README» se deniega (3.6284ms)
✔ ataque 1: escribir documentación normal sigue permitido (0.5872ms)
✔ ataque 3 (dependencia): instalar paquetes nuevos pide permiso, incluso con nombre parecido (0.4323ms)
✔ ataque 3: con --ignore-scripts (como en la CI) el postinstall malicioso NO se ejecuta (1287.8054ms)
✔ ataque 3: sin la regla, el postinstall malicioso SÍ se ejecuta (npm 11 solo avisa) (1382.6844ms)
ℹ tests 24
ℹ suites 0
ℹ pass 24
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2775.4242
```

## Cómo reproducirlo

```bash
npm ci --ignore-scripts && npx husky
npm run check
```
