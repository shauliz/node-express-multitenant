# Node Multi Tenancy Library

[![CI](https://github.com/shauliz/node-express-multitenant/actions/workflows/release.yml/badge.svg)](https://github.com/shauliz/node-express-multitenant/actions/workflows/release.yml)
[![npm version](https://img.shields.io/npm/v/node-express-multitenant.svg)](https://www.npmjs.com/package/node-express-multitenant)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Shared-database multi-tenancy for **Express** + **Prisma**.

The library extracts a tenant ID per request, stores it in `AsyncLocalStorage`, and automatically injects it into Prisma queries via a Client Extension — so developers cannot accidentally omit the tenant filter.

> **v2** uses Prisma Client Extensions (`$extends`). If you are on v1 (`prisma.$use`), see [Migrating from v1](#migrating-from-v1).

---

## Requirements

- Node.js `>= 20`
- Prisma `^5` or `^6`
- Express `^4` or `^5`

## Install

```bash
npm install node-express-multitenant
```

Your Prisma models that should be tenant-scoped must include a tenant column (default name: `account_id`).

---

## Quick start

### 1. Express middleware

```ts
import express from "express";
import { getMultitenancyMiddleware } from "node-express-multitenant";

const app = express();

// Mount AFTER authentication when the extractor reads verified claims.
app.use(
  getMultitenancyMiddleware((req) => {
    // Prefer JWT / session claims over a raw header.
    return req.headers["account-id"];
  }),
);
```

If you omit the extractor, the default reads `req.headers["account-id"]`. That default is **not secure** without authentication in front of it.

### 2. Prisma Client Extension

```ts
import { PrismaClient } from "@prisma/client";
import { withMultitenancy } from "node-express-multitenant";

const prisma = new PrismaClient().$extends(
  withMultitenancy({ tenantField: "account_id" }),
);
```

Queries against models that have `account_id` are automatically scoped. Models without that column are left untouched.

### 3. Use Prisma as usual

```ts
// Reads / updates / deletes are filtered by the current tenant.
const users = await prisma.user.findMany();

// Creates get account_id injected (overwrites any value you pass).
await prisma.user.create({
  data: { email: "a@example.com", name: "Ada", account_id: 0 },
});

// findUnique is rewritten to findFirst with the tenant filter applied.
const user = await prisma.user.findUnique({
  where: { email: "a@example.com" },
});
```

### Bypass scoping (escape hatch)

```ts
const allUsers = await prisma.user.findMany({
  // @ts-expect-error custom library flag stripped before Prisma runs
  ignoreMultitenancy: true,
});
```

---

## Behavior

| Area | Behavior |
| --- | --- |
| Scoped actions | `findFirst`, `findFirstOrThrow`, `findMany`, `findUnique`*, `findUniqueOrThrow`*, `create`, `createMany`, `upsert`, `update`, `updateMany`, `delete`, `deleteMany`, `count`, `aggregate`, `groupBy` |
| Tenant IDs | `string` or `number` (coerced to int when the Prisma field type is `Int`/`BigInt`) |
| Missing context | Throws `MissingTenantContextError` (**fail closed**) |
| Not scoped | `$queryRaw`, `$executeRaw`, and any model **without** the tenant column |

\* `findUnique` / `findUniqueOrThrow` are rewritten to `findFirst` / `findFirstOrThrow` because Prisma rejects non-unique fields in a `findUnique` where clause.

**Schema tip:** Prefer compound uniques that include the tenant column (e.g. `@@unique([email, account_id])`). Globally unique fields shared across tenants can make cross-tenant `upsert` collide on create after the tenant filter correctly prevents an update.

---

## Background

There are multiple ways of achieving multi-tenancy (DB-per-tenant, schema-per-tenant, shared database). This library implements the **shared database, shared schema** approach: most tables hold a tenant column, and every CRUD operation must filter by it.

Humans forget `WHERE account_id = …`. That mistake can leak one tenant's data to another. This library takes that responsibility out of the developer's hands.

See [`examples/express-prisma`](./examples/express-prisma) for a wiring sketch.

---

## Migrating from v1

```ts
// v1
import { addMultitenancy } from "node-express-multitenant";
prisma.$use((params, next) =>
  addMultitenancy(params, next, prisma, "account_id"),
);

// v2
import { withMultitenancy } from "node-express-multitenant";
const prisma = new PrismaClient().$extends(
  withMultitenancy({ tenantField: "account_id" }),
);
```

Other breaking changes:

- Node `>= 20`, Prisma `^5`/`^6`, Express as a peer dependency
- Missing tenant context throws instead of using `-1`
- `addMultitenancy` is removed; use `withMultitenancy`

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Please read [SECURITY.md](./SECURITY.md) before reporting isolation bugs.

## License

[MIT](./LICENSE)
