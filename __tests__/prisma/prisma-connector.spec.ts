import { getContextManager } from "../../src";
import { prismaMock } from "./singleton.spec";

const contextManager = getContextManager();

test("should read the proper user", async () => {
  const user = {
    id: 1,
    name: "Rich",
    email: "hello@prisma.io",
    account_id: 1,
  };

  prismaMock.user.create.mockResolvedValue(user);

  const retrievedUser = prismaMock.user.findMany({
    where: {
      id: 1,
    },
  });
  const data = { accountId: 1 };
  contextManager.run(data, async () => {
    await expect(retrievedUser).resolves.toEqual({
      id: 1,
      name: "Rich",
      email: "hello@prisma.io",
    });
  });
});

test("should not read user", async () => {
  const user = {
    id: 1,
    name: "Rich",
    email: "hello@prisma.io",
    account_id: 1,
  };

  prismaMock.user.create.mockResolvedValue(user);

  const retrievedUser = prismaMock.user.findMany({
    where: { id: 1 },
  });
  const data = { accountId: 2 };
  contextManager.run(data, async () => {
    await expect(retrievedUser).resolves.toEqual({
      id: 1,
      name: "Rich",
      email: "hello@prisma.io",
    });
  });
});

test("should read multiple users", async () => {
  const user = {
    id: 1,
    name: "Rich",
    email: "hello@prisma.io",
    account_id: 1,
  };

  prismaMock.user.create.mockResolvedValue(user);

  const retrievedUser = prismaMock.user.findMany();

  const data = { accountId: 1 };
  contextManager.run(data, async () => {
    await expect(retrievedUser).resolves.toEqual({
      id: 1,
      name: "Rich",
      email: "hello@prisma.io",
    });
  });
});

test("should not read multiple users", async () => {
  const user = {
    id: 1,
    name: "Rich",
    email: "hello@prisma.io",
    account_id: 1,
  };

  prismaMock.user.create.mockResolvedValue(user);

  const retrievedUser = prismaMock.user.findMany();

  const data = { accountId: 2 };
  contextManager.run(data, async () => {
    await expect(retrievedUser).resolves.toEqual({
      id: 1,
      name: "Rich",
      email: "hello@prisma.io",
    });
  });
});
