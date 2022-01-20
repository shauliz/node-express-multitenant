import { PrismaClient } from '@prisma/client'
import {addMultitenancy} from '../../app/prisma-connector'

const prisma = new PrismaClient()
prisma.$use((params, next) => {
    return addMultitenancy(params, next, prisma, 'account_id');
  });
  
export default prisma
