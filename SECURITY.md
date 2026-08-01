# Security Policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| 2.x     | Yes       |
| 1.x     | Best effort (security fixes may require upgrading to 2.x) |

## Reporting a vulnerability

This library exists to prevent cross-tenant data leaks. Treat suspected isolation bugs as security issues.

Please report vulnerabilities privately:

1. Email the maintainer listed in `package.json` / GitHub profile, **or**
2. Use GitHub's private [Security Advisories](https://github.com/shauliz/node-express-multitenant/security/advisories/new) if available on the repository.

Include:

- A clear description of the issue
- Steps to reproduce (minimal Prisma schema + query if possible)
- Impact assessment (e.g. cross-tenant read/write)
- Whether you are able to help test a fix

Please **do not** open a public GitHub issue for security vulnerabilities until a fix is released or we agree it is safe to disclose.

We aim to acknowledge reports within 7 days and to ship a fix or mitigation as quickly as possible.

## Non-vulnerabilities

The following are known limitations, not vulnerabilities by themselves:

- `$queryRaw` / `$executeRaw` are **not** auto-scoped. Consumers must add tenant filters manually.
- Tenant extraction is the consumer's responsibility. The default `account-id` header extractor is insecure without authentication in front of it.
- Models without the configured tenant column are intentionally left unscoped.
- Prefer compound unique indexes that include the tenant column (e.g. `@@unique([email, account_id])`). A globally unique field shared across tenants can cause `upsert` to fail on create after the tenant filter correctly prevents updating another tenant's row — the other tenant's data is still protected.
