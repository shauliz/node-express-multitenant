/**
 * Minimal Express + Prisma example using node-express-multitenant v2.
 *
 * This file is illustrative — wire it into your own app with a real Prisma
 * schema that includes an `account_id` (or custom) tenant column.
 */
import express from "express";
import { PrismaClient } from "@prisma/client";
import {
  getMultitenancyMiddleware,
  withMultitenancy,
} from "node-express-multitenant";

const app = express();

const prisma = new PrismaClient().$extends(
  withMultitenancy({ tenantField: "account_id" }),
);

/**
 * Prefer extracting the tenant from a verified JWT (or session) rather than
 * a raw header. The default header extractor is insecure on its own.
 */
function extractTenantFromJwt(request: express.Request) {
  // Example only — use your auth library's verified claims in production.
  const claims = (request as express.Request & { user?: { accountId?: number } })
    .user;

  return claims?.accountId;
}

app.use(express.json());

// Mount AFTER authentication middleware so the extractor can trust claims.
app.use(getMultitenancyMiddleware(extractTenantFromJwt));

app.get("/users", async (_request, response, next) => {
  try {
    // Automatically scoped to the current tenant — no where.account_id needed.
    const users = await prisma.user.findMany();

    response.json(users);
  } catch (error) {
    next(error);
  }
});

app.get("/users/:email", async (request, response, next) => {
  try {
    // findUnique is rewritten to findFirst with the tenant filter applied.
    const user = await prisma.user.findUnique({
      where: { email: request.params.email },
    });

    if (!user) {
      response.status(404).json({ error: "Not found" });

      return;
    }

    response.json(user);
  } catch (error) {
    next(error);
  }
});

app.post("/users", async (request, response, next) => {
  try {
    // account_id is injected from tenant context (overwrites any value in body).
    const user = await prisma.user.create({
      data: {
        email: request.body.email,
        name: request.body.name,
        account_id: 0,
      },
    });

    response.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

app.get("/admin/users", async (_request, response, next) => {
  try {
    // Escape hatch for intentional cross-tenant access (e.g. admin tools).
    const users = await prisma.user.findMany({
      // @ts-expect-error custom library flag
      ignoreMultitenancy: true,
    });

    response.json(users);
  } catch (error) {
    next(error);
  }
});

app.listen(3000, () => {
  // eslint-disable-next-line no-console
  console.log("Example listening on http://localhost:3000");
});
