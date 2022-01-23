import { PrismaClient } from "@prisma/client";
import { mockDeep, mockReset, DeepMockProxy } from "jest-mock-extended";
import prismaClient from "./prisma-client.spec";

jest.mock("./client", () => ({
  __esModule: true,
  default: mockDeep<PrismaClient>(),
}));

beforeEach(() => {
  mockReset(prismaMock);
});

export const prismaMock =
  prismaClient as unknown as DeepMockProxy<PrismaClient>;
