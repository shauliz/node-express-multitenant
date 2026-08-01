# Contributing

Thanks for your interest in contributing to `node-express-multitenant`.

## Development setup

1. Use Node.js 20+.
2. Install dependencies: `npm install`
3. Apply the test database migrations: `npm run createdb`
4. Run the suite: `npm run lint && npm test && npm run build`

## Project structure

- `src/app/` — library source (middleware, AsyncLocalStorage context, Prisma extension)
- `src/__tests__/` — Jest tests against a real SQLite Prisma schema
- `examples/` — runnable consumer examples
- `dist/` — build output (do not edit)

## Coding guidelines

- Keep changes focused. This is a small security-sensitive library.
- Prefer fail-closed behavior for anything related to tenant isolation.
- Add or update tests for every scoping behavior change.
- Follow Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, etc.). Commitlint is enforced via a git hook.
- Pre-commit runs `lint` and `test`.

## Pull requests

1. Open a PR against `master`.
2. Describe the problem, the approach, and any security implications.
3. Ensure CI is green (lint, test, build on Node 20/22).
4. Update `CHANGELOG.md` and docs (`README.md`, `AGENTS.md`) when the public API or behavior changes.

## Security issues

Do **not** open a public issue for vulnerabilities. See [SECURITY.md](./SECURITY.md).
