import { getContextManager } from "app/context-manager";
import getDb from "app/prisma/prisma-client";

/* eslint-disable camelcase */

describe("read", () => {
  let contextManager;
  let prisma;

  beforeAll(() => {
    contextManager = getContextManager();
    prisma = getDb();
  });

  function initializeDatabase() {
    return prisma.user.deleteMany({
      ignoreMultitenancy: true,
    });
  }

  beforeEach(async () => {
    await initializeDatabase();
  });

  afterEach(async () => {
    await initializeDatabase();
  });

  it("should read the proper user", async () => {
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

      expect(retrievedUser[0]).toStrictEqual(user);
    });
  });

  it("should override the account id", async () => {
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

      expect(retrievedUser[0]).toStrictEqual(user);
    });
  });

  it("should not read the proper user", async () => {
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

      expect(retrievedUser).toStrictEqual([]);
    });
  });

  it("should ignore multi tenancy", async () => {
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

      expect(retrievedUser[0]).toStrictEqual(user);
    });
  });

  it("should consider multi tenancy", async () => {
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

      expect(retrievedUser).toStrictEqual([]);
    });
  });

  it("should get proper user with OR clause", async () => {
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

      expect(retrievedUser[0]).toStrictEqual(user);
    });
  });

  it("should not get proper user with OR clause", async () => {
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

      expect(retrievedUser).toStrictEqual([]);
    });
  });

  it("should create with the correct account_id", () => {
    const accountId = 7;
    const dummyAccountId = 17;
    const data = { accountId };

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

      expect(retrievedUser[0]).toStrictEqual({
        id: 1,
        name: "Shaul Zuarets",
        email: "shaul@zuarets.io",
        account_id: accountId,
      });
    });
  });

  it("should create and override account_id", () => {
    const accountId = 7;
    const dummyAccountId = 17;
    const data = { accountId };

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

      expect(retrievedUser).toStrictEqual([]);
    });
  });
});
