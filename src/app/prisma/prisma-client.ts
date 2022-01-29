import { PrismaClient } from "@prisma/client";
import { addMultitenancy } from "app/prisma-connector";

let prisma;

export default function getDb() {
  if (!prisma) {
    prisma = new PrismaClient();

    prisma.$use((parameters, next) =>
      addMultitenancy(parameters, next, prisma, "account_id"),
    );
  }

  return prisma;
}
