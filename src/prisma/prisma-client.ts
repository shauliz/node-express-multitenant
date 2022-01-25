import { PrismaClient } from '@prisma/client'
import { addMultitenancy } from "app/prisma-connector";

let prisma;

function getDb() {
    if (!prisma) {
      prisma = new PrismaClient();
  
      prisma.$use((params, next) => {
        return addMultitenancy(params, next, prisma, 'account_id');
      });
     
    }
  
    return prisma;
  }
export default getDb;