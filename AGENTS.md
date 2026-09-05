# Guía de arquitectura — Kitab API

## Propósito y ejecución

API REST de Kitab construida con Express, PostgreSQL y TypeScript en modo ESM.

- Desarrollo: `npm run dev`
- Verificación estática: `npm run typecheck`
- Compilación: `npm run build`
- Producción: `npm start`
- Pruebas futuras: `npm test`

El proyecto usa `module` y `moduleResolution` `NodeNext`. En imports relativos entre archivos TypeScript se debe escribir la extensión `.js`:

```ts
import { PeriodsUseCases } from './application/periods.use-cases.js';
```

TypeScript resuelve el archivo `.ts` durante el desarrollo y emite imports válidos para Node.js en `dist/`.

## Estructura

```text
src/
  app.ts                         # Configuración de Express y rutas raíz
  server.ts                      # Arranque HTTP y cronjobs
  config/                        # Infraestructura global (PostgreSQL)
  middleware/                    # Adaptadores HTTP transversales
  jobs/                          # Tareas programadas
  services/                      # Utilidades de infraestructura aún compartidas
  shared/                        # Código técnico reutilizable, sin reglas de dominio
  utils/                         # Integraciones auxiliares (p. ej. geolocalización)
  modules/
    auth/
    periods/
    subjects/
```

Cada módulo de dominio sigue esta forma:

```text
modules/<dominio>/
  <dominio>.routes.ts            # URLs y middleware
  <dominio>.controller.ts        # HTTP: req/res, cookies y códigos de estado
  <dominio>.schemas.ts           # Validación Zod y tipos inferidos
  <dominio>.types.ts             # DTOs y tipos de filas de base de datos
  <dominio>.mapper.ts            # Conversión DB (snake_case) ↔ API (camelCase)
  <dominio>.errors.ts            # Errores del dominio
  application/
    <dominio>.use-cases.ts       # Reglas y orquestación de negocio
  infrastructure/
    pg-<dominio>.repository.ts   # SQL y acceso a PostgreSQL
```

## Flujo de una solicitud

```text
route → middleware → controller → schema Zod → use case → repository → PostgreSQL
                                              ← resultado/error ←
```

- **Routes** declaran rutas y middleware; no contienen reglas de negocio.
- **Controllers** convierten HTTP en llamadas a casos de uso. Solo ellos manejan `Request`, `Response`, códigos HTTP y cookies.
- **Schemas** validan datos externos con Zod. Los tipos se infieren con `z.infer`; no duplicar interfaces de payload manualmente.
- **Use cases** contienen reglas de negocio, propiedad de recursos y coordinación de operaciones. No deben emitir respuestas HTTP ni incluir SQL.
- **Repositories** contienen consultas SQL y reciben/devuelven tipos de filas. No conocen Express.
- **Mappers** son el único lugar para convertir nombres de columnas o formatos entre DB y API.

## Código compartido

`src/shared` es únicamente para preocupaciones técnicas repetidas:

- `shared/database/transaction.ts`: usar `withTransaction` para toda operación atómica. No volver a escribir `BEGIN`/`COMMIT`/`ROLLBACK` en repositorios o casos de uso.
- `shared/http/`: usar `AuthenticatedRequest`, `getUserIdOrRespond`, `AppError` y `sendErrorResponse` para el comportamiento HTTP común.
- `shared/validation/`: reutilizar esquemas genéricos de ID y fecha.
- `shared/utils/date.ts`: usar `toDateOnly` para fechas públicas `YYYY-MM-DD`.

No mover reglas de materias, períodos, clases o autenticación a `shared` solo porque se usen más de una vez. Primero deben permanecer en su módulo de dominio.

Las clases pertenecen al dominio `subjects`. Si `periods` crea una materia con clases, debe reutilizar `classSchema`, `toClassDto` y `toSubjectDto` de `subjects`, en vez de crear copias.

## Datos, errores y transacciones

- PostgreSQL usa `snake_case`; los DTOs de la API usan `camelCase`.
- Nunca interpolar valores de usuario en SQL: usar parámetros `$1`, `$2`, etc.
- Un error de negocio debe extender `AppError` o una de sus subclases. Los controladores deben delegar la respuesta a `sendErrorResponse`.
- Las violaciones de unicidad de PostgreSQL (`23505`) se traducen a conflicto `409` con un mensaje específico del recurso.
- Operaciones que modifiquen más de una tabla deben usar `withTransaction(pool, callback)`.

## Autenticación y seguridad

- Las cookies (`HttpOnly`, `SameSite`, `Secure`) se definen únicamente en `modules/auth/auth.cookies.ts` y se envían o limpian desde `auth.controller.ts`.
- `auth.use-cases.ts` gestiona credenciales, sesiones, JWT y refresh tokens; no debe depender de `Response` ni manipular cookies.
- El refresh token es de un solo uso. Ante reutilización, la revocación de tokens y desactivación de la sesión deben confirmarse antes de responder con error.
- Las rutas protegidas usan `authMiddleware`; los controladores consumen el usuario mediante `AuthenticatedRequest`.
- Las rutas que cambian estado bajo `/api` pasan por `csrfOriginMiddleware`.

## Convenciones

- Escribir código TypeScript legible: nombres explícitos, bloques multilinea cuando aclaren el flujo y una responsabilidad por función.
- Añadir un comentario breve de propósito sobre funciones públicas y helpers no obvios.
- Evitar `any`; usar `unknown` en bordes externos y validarlo con Zod o type guards.
- No crear nuevos archivos `.js` de aplicación. El código de producción nuevo debe ser `.ts`.
- Mantener mensajes y forma de respuesta pública al refactorizar, salvo que el cambio de contrato esté solicitado explícitamente.

## Pruebas futuras

Las pruebas se crearán en TypeScript y estarán agrupadas por módulo, no en una carpeta global:

```text
src/modules/<dominio>/tests/
  application/<caso-de-uso>.test.ts          # Unitarias: caso de uso + repositorio falso
  infrastructure/pg-<dominio>.test.ts        # Integración: repositorio + PostgreSQL de prueba
  <dominio>.routes.test.ts                   # Integración HTTP: rutas, middleware y respuestas
```

- Las pruebas unitarias deben probar reglas de negocio sin Express ni una base de datos real.
- Las pruebas de repositorio deben usar una base de datos aislada; nunca la configuración de producción.
- Las pruebas de rutas verifican contrato HTTP, validación Zod, autenticación y cookies cuando aplique.
- Al escribir una prueba, importar la implementación actual del módulo; no recrear ni depender de servicios o validators eliminados.

## Antes de finalizar un cambio

1. Ejecutar `npm run typecheck`.
2. Ejecutar `npm run build`.
3. Si hay pruebas pertinentes, ejecutar `npm test` o el archivo de prueba concreto.
4. Confirmar que no se duplicó lógica ya presente en `shared` o en el módulo dueño del dominio.
