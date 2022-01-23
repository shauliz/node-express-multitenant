import { PrismaClient } from "@prisma/client";
import { addMultitenancy } from "app/prisma-connector";

const prismaClient = new PrismaClient();
prismaClient.$use((params, next) => {
  return addMultitenancy(params, next, prismaClient, "account_id");
});

export default prismaClient;
