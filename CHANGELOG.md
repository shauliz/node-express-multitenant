# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0](https://github.com/shauliz/node-express-multitenant/compare/node-express-multitenant-v2.0.0...node-express-multitenant-v3.0.0) (2026-08-01)


### ⚠ BREAKING CHANGES

* replace addMultitenancy/$use with withMultitenancy/$extends; missing tenant context throws MissingTenantContextError.

### Features

* add changelog and version bump ([#26](https://github.com/shauliz/node-express-multitenant/issues/26)) ([51ac828](https://github.com/shauliz/node-express-multitenant/commit/51ac828c425dbd64ec39cde6238f4efa74f49df8)), closes [#25](https://github.com/shauliz/node-express-multitenant/issues/25)
* general refactor ([#10](https://github.com/shauliz/node-express-multitenant/issues/10)) ([f796526](https://github.com/shauliz/node-express-multitenant/commit/f79652612211c5e4fdd955d139fbf723733cb812))
* modernize library to Prisma Client Extensions for v2 ([d606bf4](https://github.com/shauliz/node-express-multitenant/commit/d606bf46f8b1175a38a9932fdd38a8dcec44c708))


### Bug Fixes

* fix declaration directory path ([#18](https://github.com/shauliz/node-express-multitenant/issues/18)) ([d0c58f6](https://github.com/shauliz/node-express-multitenant/commit/d0c58f67f1f86a4b987719ce053ee044881e273a))
* Use prepare lifecycle event ([#14](https://github.com/shauliz/node-express-multitenant/issues/14)) ([3ce136d](https://github.com/shauliz/node-express-multitenant/commit/3ce136d9d3fa8ef7fb5e7c7f5afeed7eda38057e))

## [2.0.0] - 2026-08-01

### Breaking Changes

- Replaced Prisma `$use` middleware (`addMultitenancy`) with a Prisma Client Extension (`withMultitenancy`). Consumers must migrate:

  ```ts
  // v1
  prisma.$use((params, next) => addMultitenancy(params, next, prisma, "account_id"));

  // v2
  const prisma = new PrismaClient().$extends(
    withMultitenancy({ tenantField: "account_id" }),
  );
  ```

- Missing tenant context now throws `MissingTenantContextError` (fail closed) instead of silently using `-1`.
- Requires Node.js `>= 20` and Prisma `^5` or `^6`.
- Express is now a peer dependency (`^4 || ^5`).

### Added

- Full action coverage: `findUnique`, `findUniqueOrThrow`, `findFirstOrThrow`, `count`, `aggregate`, `groupBy`, and correct `createMany` array scoping.
- `findUnique` / `findUniqueOrThrow` are rewritten to `findFirst` / `findFirstOrThrow` with the tenant filter applied.
- Support for numeric and string/UUID tenant IDs (coerced to int only when the Prisma field type is `Int`/`BigInt`).
- Typed public API (`TenantId`, `AccountIdExtractor`, `WithMultitenancyOptions`, etc.).
- Dual ESM + CJS builds via `tsup`.

### Fixed

- Create tests that never awaited `contextManager.run` (false greens).
- `createMany` incorrectly wrote the tenant field onto the data object instead of each array element.

### Changed

- Upgraded toolchain: TypeScript 5, ESLint 9 (flat config), Jest 30, Husky 9, Prisma 6, Commitlint 19.
- CI now tests Node 20 and 22.
- `@prisma/client` is a **peer dependency only** (no longer bundled), so tenant-field detection uses the consumer's generated DMMF.
- `prepare` no longer runs `prisma generate` (schema is not published), avoiding install failures for consumers.

## [1.2.8] - previous

Last release of the `$use`-based API.
