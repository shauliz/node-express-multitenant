import { PrismaClient } from "@prisma/client";

import { withMultitenancy } from "app/prisma-connector";

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

let prisma: ExtendedPrismaClient | undefined;

function createPrismaClient() {
  return new PrismaClient().$extends(
    withMultitenancy({ tenantField: "account_id" }),
  );
}

/**
 * Internal Prisma client used by the test suite only. Not part of the public API.
 */
export default function getDb(): ExtendedPrismaClient {
  if (!prisma) {
    prisma = createPrismaClient();
  }

  return prisma;
}
