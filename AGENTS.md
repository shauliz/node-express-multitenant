# AGENTS.md

Guidance for AI coding agents (and humans) working in this repository.

---

## 1. What this project is

`node-express-multitenant` is a **small, published npm library** (currently `v1.2.8`, MIT) that adds **shared-database multi-tenancy** to Node.js backends built on **Express** and the **Prisma ORM**.

> ⚠️ **This is a library, not an application.** There is no HTTP server, no routes, no controllers, no authentication layer, and no deployment target other than `npm publish`. Consumers install this package and wire it into *their own* Express + Prisma apps. When you see sections about "requests", "middleware", or "auth" below, they describe how a **consumer** uses the library — not code that lives here.

- **Repo:** https://github.com/shauliz/node-express-multitenant
- **Author:** Shaul Zuarets · **Contributor:** Yakir Gottesman
- **Package entry (published):** `dist/main.bundle.js` (+ types at `dist/index.d.ts`)
- **Total library source:** ~7 TypeScript files, ~240 lines. Keep changes tight and focused.

---

## 2. Business context: the problem being solved

Multi-tenant SaaS applications serve many customers ("tenants", called **accounts** here) from one running application. There are three common isolation strategies:

1. **Database per tenant**
2. **Schema per tenant**
3. **Shared database, shared schema** (row-level isolation) ← *this library implements only this one*

In the shared-database model, (almost) every table has a tenant column (default: **`account_id`**), and **every** query must be filtered by it:

```sql
-- DANGEROUS: leaks every tenant's data
SELECT * FROM Transactions;

-- CORRECT: scoped to one tenant
SELECT * FROM Transactions WHERE account_id = 7;
```

The core risk: **humans forget the `WHERE` clause**, which silently exposes one tenant's data to another — effectively a data breach. This library **removes that responsibility from developers** by automatically injecting the tenant filter into Prisma queries. From an application developer's perspective, the app appears single-tenant; the library transparently scopes reads, writes, updates, and deletes to the current tenant.

An explicit escape hatch (`ignoreMultitenancy`) exists for the rare cases where cross-tenant access is intended.

---

## 3. How it works (architecture)

Three cooperating pieces move the tenant ID from an incoming HTTP request all the way down to the database query:

```
HTTP request (in consumer's Express app)
   │
   ▼
[1] getMultitenancyMiddleware(extractor?)      src/app/express-middleware.ts
   │   extracts tenant id from the request
   │   (default: req.headers["account-id"])
   ▼
[2] contextManager.run({ accountId }, next)    src/app/context-manager.ts
   │   AsyncLocalStorage stores the id per-request
   │   (isolates concurrent requests)
   ▼
   route handlers / services call Prisma ...
   │
   ▼
[3] prisma.$use(addMultitenancy)               src/app/prisma-connector.ts
   │   reads accountId from AsyncLocalStorage
   │   checks the model has the tenant column (via DMMF)
   │   injects account_id into `where` (reads/updates/deletes)
   │   or into `data` (creates)
   ▼
Database query, scoped to the current tenant
```

### [1] Tenant resolution — Express middleware
`src/app/express-middleware.ts` exports a **middleware factory** `getMultitenancyMiddleware(accountIdExtractor?)`:

- If no extractor is passed, the default reads `req.headers["account-id"]`.
- The extractor result is stored as `{ accountId }` and `next()` is invoked **inside** `contextManager.run(...)` so the value is available for the entire async request lifecycle.
- The **extractor is the security boundary.** The README is explicit that the header default is "not very secured" — a consumer should supply an extractor that reads a trusted source (e.g. a verified JWT claim). This library does **not** authenticate anything.

### [2] Request-scoped storage — AsyncLocalStorage
`src/app/context-manager.ts` exports a **singleton `AsyncLocalStorage`** instance (`contextManager`). Store shape: `{ accountId: <value> }`. This keeps concurrent requests from cross-contaminating tenant context. It is also exported publicly so it can be driven manually (the tests do exactly this via `contextManager.run(...)`).

### [3] Query scoping — Prisma `$use` middleware
`src/app/prisma-connector.ts` is the heart of the library.

- **`addMultitenancy(parameters, next, prisma, accountIdColumnName = "account_id")`** — the function a consumer registers with `prisma.$use(...)`.
- **`isTenantFieldExists(parameters, fieldName, prisma)`** — uses Prisma's internal **DMMF** (`prisma._dmmf.datamodel.models`) to check whether the queried model actually has the tenant column. If the model has no such column, scoping is **skipped** (so lookup/reference tables work untouched).

Scoping behavior by action:

| Prisma action | Scoped? | How |
|---|---|---|
| `findFirst`, `findMany`, `update`, `updateMany`, `delete`, `deleteMany` | ✅ | sets `args.where[account_id] = <tenant>` |
| `create`, `createMany`, `upsert` | ✅ | sets `args.data[account_id] = <tenant>` |
| `findUnique`, `count`, `aggregate`, `groupBy` | ❌ | **not** in either action list — no auto-scoping |
| `$queryRaw` / `$executeRaw`, nested relation writes | ❌ | not intercepted |

Key details to keep in mind when editing this file:
- The tenant value comes from `getAccountId()`, which reads `contextManager.getStore().accountId`, runs it through `parseInt(...)`, and **falls back to `-1`** when context is missing (silent "no rows" rather than an error).
- For scoped queries, the top-level `account_id` in `where` is **always overwritten** by the context value — even if a developer set a different one. `OR` sub-clauses are preserved (they get AND'd with the tenant filter). This is intentional and covered by tests.

### Bypass flag: `ignoreMultitenancy`
Any Prisma query can opt out by adding a **library-specific** arg:

```ts
await prisma.user.findMany({ where: { /* ... */ }, ignoreMultitenancy: true });
```

`shouldValidateMultitenancy` reads `args.ignoreMultitenancy`, **deletes it** (so Prisma never sees the unknown arg), and skips scoping when it is `true`. Passing `false` explicitly forces scoping on.

---

## 4. Public API (`src/index.ts`)

```ts
export { default as getMultitenancyMiddleware } from "./app/express-middleware";
export { addMultitenancy, isTenantFieldExists } from "./app/prisma-connector";
export { default as contextManager } from "./app/context-manager";
```

**Consumer integration template:**

```ts
import express from "express";
import { PrismaClient } from "@prisma/client";
import { getMultitenancyMiddleware, addMultitenancy } from "node-express-multitenant";

const app = express();
const prisma = new PrismaClient();

// 1) resolve + store tenant per request (supply a SECURE extractor in production)
app.use(getMultitenancyMiddleware((req) => req.headers["account-id"]));

// 2) auto-scope every eligible Prisma query
prisma.$use((params, next) => addMultitenancy(params, next, prisma, "account_id"));
```

Recommended middleware order for a consumer: body parser / CORS → **authentication** → `getMultitenancyMiddleware(...)` → routes.

---

## 5. Repository layout

```
node-express-multitenant/
├── .github/workflows/release.yml   # CI: lint, migrate test DB, test, build (Node 14.x & 16.x)
├── .husky/
│   ├── commit-msg                  # commitlint (conventional commits)
│   └── pre-commit                  # runs `npm run lint` + `npm run test`
├── src/
│   ├── index.ts                    # public API barrel (the ONLY published surface)
│   ├── app/
│   │   ├── context-manager.ts      # AsyncLocalStorage singleton
│   │   ├── express-middleware.ts   # tenant-extraction middleware factory
│   │   ├── prisma-connector.ts     # Prisma $use scoping logic  ← core
│   │   └── prisma/                 # TEST/DEV ONLY schema + client
│   │       ├── schema.prisma       # SQLite, single `User` model with account_id
│   │       ├── prisma-client.ts    # internal getDb() singleton (NOT exported)
│   │       └── migrations/         # 20220125191605_init/migration.sql
│   └── __tests__/prisma/read.spec.ts   # the only test file (9 cases)
├── dist/                           # webpack build output (gitignored; published artifact)
├── webpack.common.js / .dev.js / .prod.js
├── jest.config.js · tsconfig.json · .eslintrc.json · .prettierrc.json
├── package.json · README.md · LICENSE
```

The `src/app/prisma/` schema, client, and migration exist **only to run the test suite** against a real SQLite database. Consumers bring their own Prisma schema/client.

---

## 6. Tech stack

| Area | Choice |
|---|---|
| Language | TypeScript ~4.5 (strict mode **not** enabled) |
| Runtime | Node **>= 16.4** (`engines`); webpack target node16 |
| ORM | Prisma ~3.8 (dev) · `@prisma/client` ^3.0 (dependency **and** peer) |
| Test DB | SQLite (`file:./dev.db`) via Prisma |
| Bundler | Webpack 5 (+ `ts-loader`, `tsconfig-paths-webpack-plugin`) |
| Tests | Jest 27 + `ts-jest` |
| Lint / format | ESLint 7 (strict custom rules) + Prettier |
| Git hooks | Husky 7 (pre-commit lint+test, commit-msg commitlint) |
| Commits | Conventional Commits (`@commitlint/config-conventional`) |

**Important dependency notes:**
- **Express is NOT a dependency or peer dependency.** The middleware follows the `(req, res, next)` contract, but the consumer installs Express. Do not add Express as a runtime dependency without a deliberate reason.
- No `.env` files and **no environment variables** are used anywhere. All configuration is code-level (extractor function, tenant column name, Prisma schema path in `package.json`).

---

## 7. Commands

Run from the repo root:

| Task | Command |
|---|---|
| Install (also runs husky + `prisma generate`) | `npm install` |
| Lint | `npm run lint` |
| **Prepare test DB (run before tests)** | `npm run createdb`  (`prisma migrate dev`) |
| Run tests | `npm run test` |
| Tests with coverage | `npm run test -- --coverage=true` |
| Production build | `npm run build`  (→ `dist/main.bundle.js`) |
| Dev build | `npm run build:dev` |
| Watch build | `npm run watch` |

- `prepare` runs on install: `husky install && prisma generate`.
- `prepublishOnly` runs `npm run build` before publishing.
- CI (`.github/workflows/release.yml`) on `master`: `npm ci` → `lint` → `createdb` → `test --coverage` (retried up to 3×) → `build`, matrixed over Node 14.x and 16.x.

---

## 8. Testing

- Single suite: `src/__tests__/prisma/read.spec.ts` (9 cases) exercising real SQLite through the internal `getDb()` client.
- Jest config (`jest.config.js`) uses `preset: "ts-jest"`, `testEnvironment: "node"`, and `moduleDirectories: ["node_modules", "src"]` — the latter enables the `app/*` path alias in imports.
- Tests simulate a request by calling `contextManager.run({ accountId: N }, async () => { ... })`, then asserting the query was (or wasn't) scoped.
- Seeding / cleanup use `ignoreMultitenancy: true` on `create`/`deleteMany` to bypass scoping.
- Coverage today is limited to reads, `create`, the `OR` clause, and the `ignoreMultitenancy` flag. If you add behavior (e.g. scoping `findUnique`/`count`/`upsert`/`updateMany`), **add matching tests** — several actions are currently untested.

Always run `npm run createdb` before `npm test` on a fresh checkout, or the SQLite DB won't exist.

---

## 9. Conventions & constraints

- **Path alias:** import internal modules as `app/...` (e.g. `import contextManager from "app/context-manager"`), enabled by `baseUrl: "src"` in `tsconfig.json` and mirrored in Jest/webpack config. Don't switch to deep relative paths.
- **Exports:** middleware and `contextManager` use **default** exports; the Prisma functions use **named** exports. Preserve this shape — `src/index.ts` re-exports accordingly and it's the published contract.
- **Strict ESLint** (`.eslintrc.json`), enforced by pre-commit. Notable rules: `no-console: error` (no logging), `camelcase: error` (use inline `eslint-disable` for `account_id`, as existing code does), `max-params: 3` (`addMultitenancy` has 4 and is explicitly disabled), `consistent-this: "that"`, `no-underscore-dangle` disabled only where `prisma._dmmf` is accessed. Tests use `plugin:jest/all`.
- **Prettier:** `trailingComma: "all"`. EditorConfig: 2-space indent, final newline, trim trailing whitespace.
- **Commits:** Conventional Commits are enforced by commitlint (`commit-msg` hook). Use `feat:`, `fix:`, `chore:`, etc.
- **Error handling is intentionally minimal:** no try/catch, no validation, no logging. Prisma errors propagate to the consumer. Missing tenant context yields `-1` rather than throwing.

---

## 10. Known quirks & gotchas (verify before "fixing")

Some of these look like bugs but may be intentional or low-priority. Confirm behavior and add tests before changing.

1. **`findUnique` is not scoped** — a real cross-tenant read risk if a consumer uses it on a tenant-scoped model. Same for `count`, `aggregate`, `groupBy`, and raw queries.
2. **`createMany` scoping writes `args.data[account_id]`**, but Prisma's `createMany` expects `data` to be an **array** — the current approach likely won't scope bulk creates correctly. Untested.
3. **`findFirst` appears twice** in `validationActions` (harmless duplicate).
4. **Top-level `where.account_id` is always overwritten** by the context value (by design, tested).
5. **Header default extractor is insecure** by itself; secure extraction is the consumer's responsibility. README mentions a future JWT default (not yet implemented).
6. **`ignoreMultitenancy` is untyped.** Consumers need TypeScript module augmentation for type-safe use; there are no shipped type helpers for it.
7. **`getAccountId()` uses `parseInt` without a radix** and returns `-1` on missing context (silent no-match instead of an explicit error).
8. Relies on Prisma **internal DMMF** (`prisma._dmmf`), which is not a stable public API and may break across Prisma major versions (pinned to Prisma 3.x here).

---

## 11. Guidance for agents making changes

- **Scope:** Nearly all meaningful logic lives in the four files under `src/app/` (`prisma-connector.ts` is the core). Keep diffs minimal and focused.
- **This is a published package.** Any change to `src/index.ts` exports or function signatures is a **breaking API change** — treat it as such (semver + changelog considerations).
- **Don't add a server, routes, or auth** to this repo — that would contradict its purpose. Such concerns belong in consumer apps or documentation/examples.
- After editing, run `npm run lint` and `npm run test` (the pre-commit hook will run both anyway). Run `npm run createdb` first if the SQLite DB is missing.
- If you change scoping behavior, update both the tests in `src/__tests__/` and the relevant sections of `README.md`.
- Prefer additive, backward-compatible changes; if you must touch `prisma._dmmf` usage, note the Prisma-version coupling.
