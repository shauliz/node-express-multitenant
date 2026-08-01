# Express + Prisma example

Illustrative wiring for `node-express-multitenant` v2.

## Key points

1. Create the Prisma client with `$extends(withMultitenancy(...))`.
2. Mount `getMultitenancyMiddleware` **after** authentication.
3. Prefer a JWT/session-based extractor over the default `account-id` header.
4. Use `ignoreMultitenancy: true` only for intentional cross-tenant operations.
5. Raw SQL (`$queryRaw` / `$executeRaw`) is **not** auto-scoped — add tenant filters yourself.

See [`server.ts`](./server.ts) for a minimal sketch. Copy the patterns into your own application rather than running this folder as a standalone package.
