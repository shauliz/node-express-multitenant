# AGENTS.md

Guidance for AI coding agents (and humans) working in this repository.

---

## 1. What this project is

`node-express-multitenant` is a **published npm library** (v2.0.0, MIT) that adds **shared-database multi-tenancy** to Node.js backends built on **Express** and the **Prisma ORM**.

> This is a library, not an application. There is no HTTP server, no routes, and no auth layer in this repo. Consumers install the package and wire it into *their own* Express + Prisma apps.

- **Repo:** https://github.com/shauliz/node-express-multitenant
- **Package entry:** `dist/index.js` (CJS) / `dist/index.mjs` (ESM) + `dist/index.d.ts`
- Keep changes tight and focused — this is a small, security-sensitive surface.

---

## 2. Business context

Multi-tenant SaaS apps serve many customers ("tenants" / "accounts") from one running application. This library implements **shared database, shared schema, row-level isolation** via a tenant column (default: `account_id`).

The core risk: developers forget the tenant `WHERE` clause and leak data across tenants. The library automatically injects the tenant filter into Prisma queries so that cannot happen by accident. An explicit escape hatch (`ignoreMultitenancy: true`) exists for intentional cross-tenant access.

---

## 3. Architecture (v2)

```
HTTP request
   │
   ▼
getMultitenancyMiddleware(extractor?)     src/app/express-middleware.ts
   │  extracts tenant id (default: account-id header)
   ▼
contextManager.run({ accountId }, next)   src/app/context-manager.ts
   │  AsyncLocalStorage per-request store
   ▼
PrismaClient.$extends(withMultitenancy)   src/app/prisma-connector.ts
   │  query.$allModels.$allOperations
   │  - skip if model has no tenant field (Prisma.dmmf)
   │  - skip if ignoreMultitenancy: true (flag stripped)
   │  - throw MissingTenantContextError if no tenant (fail closed)
   │  - inject tenant into where / data
   │  - rewrite findUnique → findFirst on parent client
   ▼
Scoped database query
```

### Public API (`src/index.ts`)

```ts
getMultitenancyMiddleware
withMultitenancy
isTenantFieldExists
contextManager
MissingTenantContextError
// types: TenantId, TenantContext, AccountIdExtractor, WithMultitenancyOptions, MultitenancyQueryArgs
```

`addMultitenancy` (v1 `$use` helper) was **removed** in v2.

### Consumer template

```ts
import { PrismaClient } from "@prisma/client";
import {
  getMultitenancyMiddleware,
  withMultitenancy,
} from "node-express-multitenant";

app.use(getMultitenancyMiddleware((req) => req.user.accountId));

const prisma = new PrismaClient().$extends(
  withMultitenancy({ tenantField: "account_id" }),
);
```

---

## 4. Repository layout

```
src/
  index.ts
  app/
    context-manager.ts
    express-middleware.ts
    prisma-connector.ts      ← core extension
    errors.ts
    types.ts
    prisma/                  ← TEST/DEV ONLY schema + client
  __tests__/prisma/read.spec.ts
examples/express-prisma/
dist/                        ← tsup output
```

---

## 5. Tech stack

| Area | Choice |
| --- | --- |
| Language | TypeScript 5 (`strict: true`) |
| Runtime | Node `>= 20` |
| ORM | Prisma 6 (peer `^5 \|\| ^6`) |
| Build | tsup (CJS + ESM + dts) |
| Tests | Jest 30 + ts-jest, SQLite |
| Lint | ESLint 9 flat config + Prettier 3 |
| Hooks | Husky 9 + commitlint 19 |
| Releases | release-please on `master` |

Express is a **peer dependency** (`^4 \|\| ^5`, optional). `@prisma/client` is a **peer dependency only** (`^5 \|\| ^6`) so DMMF comes from the consumer's generated client.

---

## 6. Commands

| Task | Command |
| --- | --- |
| Install | `npm install` |
| Lint | `npm run lint` |
| Migrate test DB | `npm run createdb` |
| Test | `npm run test` |
| Build | `npm run build` |

Always run `npm run createdb` before tests on a fresh checkout.

---

## 7. Security model (agents: preserve these invariants)

1. **Fail closed** — missing tenant context throws `MissingTenantContextError`, never invents a sentinel like `-1`.
2. **Full action coverage** for models with the tenant field (including `findUnique` rewrite and `createMany` array injection).
3. **Raw queries are not scoped** — document, do not pretend otherwise.
4. **Tenant extraction is the consumer's job** — default header extractor is insecure alone.
5. Top-level tenant field in `where`/`data` is **always overwritten** by context (intentional).

---

## 8. Conventions

- Import internals via `app/...` path alias.
- Conventional Commits enforced; pre-commit runs lint + test.
- No `console` in library code (`no-console: error`).
- Prefer additive, backward-compatible changes inside a major; API removals require a major bump and CHANGELOG entry.

---

## 9. Known intentional limitations

- `$queryRaw` / `$executeRaw` cannot be auto-scoped by model extensions.
- `ignoreMultitenancy` is a runtime flag; Prisma's generated types do not include it (use `@ts-expect-error` or local augmentation).
- Relies on public `Prisma.dmmf` (not the old private `_dmmf`).
