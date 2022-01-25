import { getContextManager } from "app/context-manager";
import getDb from "prisma/prisma-client";

const contextManager = getContextManager();
const prisma = getDb();

beforeEach(async () => {
  await initializeDatabase();
});

afterEach(async () => {
  await initializeDatabase();
});

async function initializeDatabase() {
  await prisma.user.deleteMany({
    ignoreMultitenancy: true,
  });
}
test("should read the proper user", async () => {
  const user = {
    id: 2,
    name: "Rich",
    email: "hello@prisma.io",
    account_id: 1,
  };
  const data = { accountId: 1 };
  await prisma.user.create({ data: user, ignoreMultitenancy: true });
  contextManager.run(data, async () => {
    const retrievedUser = await prisma.user.findMany({
      where: {
        id: 2,
      },
    });

    expect(retrievedUser[0]).toEqual(user);
  });
});

test("should override the account id", async () => {
  const user = {
    id: 2,
    name: "Rich",
    email: "hello@prisma.io",
    account_id: 1,
  };
  const data = { accountId: 1 };
  await prisma.user.create({ data: user, ignoreMultitenancy: true });
  contextManager.run(data, async () => {
    const retrievedUser = await prisma.user.findMany({
      where: {
        id: 2,
        account_id: 9,
      },
    });

    expect(retrievedUser[0]).toEqual(user);
  });
});

test("should not read the proper user", async () => {
  const user = {
    id: 1,
    name: "Shaul Zuarets",
    email: "shaul@zuarets.io",
    account_id: 1,
  };
  const data = { accountId: 2 };
  await prisma.user.create({ data: user, ignoreMultitenancy: true });
  contextManager.run(data, async () => {
    const retrievedUser = await prisma.user.findMany({
      where: {
        id: 1,
      },
    });

    expect(retrievedUser).toEqual([]);
  });
});

test("should ignore multi tenancy", async () => {
  const user = {
    id: 1,
    name: "Shaul Zuarets",
    email: "shaul@zuarets.io",
    account_id: 1,
  };
  const data = { accountId: 2 };
  await prisma.user.create({ data: user, ignoreMultitenancy: true });
  contextManager.run(data, async () => {
    const retrievedUser = await prisma.user.findMany({
      where: {
        id: 1,
      },
      ignoreMultitenancy: true,
    });

    expect(retrievedUser[0]).toEqual(user);
  });
});

test("should consider multi tenancy", async () => {
  const user = {
    id: 1,
    name: "Shaul Zuarets",
    email: "shaul@zuarets.io",
    account_id: 1,
  };
  const data = { accountId: 2 };
  await prisma.user.create({ data: user, ignoreMultitenancy: true });
  contextManager.run(data, async () => {
    const retrievedUser = await prisma.user.findMany({
      where: {
        id: 1,
      },
      ignoreMultitenancy: false,
    });

    expect(retrievedUser).toEqual([]);
  });
});

test("should get proper user with OR clause", async () => {
  const user = {
    id: 1,
    name: "Shaul Zuarets",
    email: "shaul@zuarets.io",
    account_id: 1,
  };
  const data = { accountId: 1 };
  await prisma.user.create({ data: user, ignoreMultitenancy: true });
  contextManager.run(data, async () => {
    const retrievedUser = await prisma.user.findMany({
      where: {
        OR: [
          {
            name: "none",
          },
          { email: "shaul@zuarets.io" },
        ],
      },
    });

    expect(retrievedUser[0]).toEqual(user);
  });
});

test("should not get proper user with OR clause", async () => {
  const user = {
    id: 1,
    name: "Shaul Zuarets",
    email: "shaul@zuarets.io",
    account_id: 1,
  };
  const data = { accountId: 2 };
  await prisma.user.create({ data: user, ignoreMultitenancy: true });
  contextManager.run(data, async () => {
    const retrievedUser = await prisma.user.findMany({
      where: {
        OR: [
          {
            name: "none",
          },
          { email: "shaul@zuarets.io" },
        ],
      },
    });

    expect(retrievedUser).toEqual([]);
  });
});

test("should create with the correct account_id", async () => {
  const accountId = 7;
  const dummyAccountId = 17;
  const data = { accountId: accountId };

  contextManager.run(data, async () => {
    await prisma.user.create({
      data: {
        id: 1,
        name: "Shaul Zuarets",
        email: "shaul@zuarets.io",
        account_id: dummyAccountId,
      },
    });
    const retrievedUser = await prisma.user.findMany({
      where: {
        id: 1,
      },
    });

    expect(retrievedUser[0]).toEqual({
      id: 1,
      name: "Shaul Zuarets",
      email: "shaul@zuarets.io",
      account_id: accountId,
    });
  });
});

test("should create and override account_id", async () => {
  const accountId = 7;
  const dummyAccountId = 17;
  const data = { accountId: accountId };

  contextManager.run(data, async () => {
    await prisma.user.create({
      data: {
        id: 1,
        name: "Shaul Zuarets",
        email: "shaul@zuarets.io",
        account_id: dummyAccountId,
      },
      ignoreMultitenancy: true,
    });
    const retrievedUser = await prisma.user.findMany({
      where: {
        id: 1,
      },
    });

    expect(retrievedUser).toEqual([]);
  });
});
