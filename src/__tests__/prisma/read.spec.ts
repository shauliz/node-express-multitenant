import contextManager from "app/context-manager";
import { MissingTenantContextError } from "app/errors";
import getDb from "app/prisma/prisma-client";

describe("multitenancy", () => {
  const prisma = getDb();

  async function initializeDatabase() {
    await prisma.user.deleteMany({
      // @ts-expect-error custom library flag stripped at runtime
      ignoreMultitenancy: true,
    });
  }

  beforeEach(async () => {
    await initializeDatabase();
  });

  afterEach(async () => {
    await initializeDatabase();
  });

  describe("read", () => {
    it("should read the proper user", async () => {
      const user = {
        id: 2,
        name: "Rich",
        email: "hello@prisma.io",
        account_id: 1,
      };

      await prisma.user.create({
        data: user,
        // @ts-expect-error custom library flag stripped at runtime
        ignoreMultitenancy: true,
      });

      await contextManager.run({ accountId: 1 }, async () => {
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

      await prisma.user.create({
        data: user,
        // @ts-expect-error custom library flag stripped at runtime
        ignoreMultitenancy: true,
      });

      await contextManager.run({ accountId: 1 }, async () => {
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

      await prisma.user.create({
        data: user,
        // @ts-expect-error custom library flag stripped at runtime
        ignoreMultitenancy: true,
      });

      await contextManager.run({ accountId: 2 }, async () => {
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

      await prisma.user.create({
        data: user,
        // @ts-expect-error custom library flag stripped at runtime
        ignoreMultitenancy: true,
      });

      await contextManager.run({ accountId: 2 }, async () => {
        const retrievedUser = await prisma.user.findMany({
          where: {
            id: 1,
          },
          // @ts-expect-error custom library flag stripped at runtime
          ignoreMultitenancy: true,
        });

        expect(retrievedUser[0]).toStrictEqual(user);
      });
    });

    it("should consider multi tenancy when ignoreMultitenancy is false", async () => {
      const user = {
        id: 1,
        name: "Shaul Zuarets",
        email: "shaul@zuarets.io",
        account_id: 1,
      };

      await prisma.user.create({
        data: user,
        // @ts-expect-error custom library flag stripped at runtime
        ignoreMultitenancy: true,
      });

      await contextManager.run({ accountId: 2 }, async () => {
        const retrievedUser = await prisma.user.findMany({
          where: {
            id: 1,
          },
          // @ts-expect-error custom library flag stripped at runtime
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

      await prisma.user.create({
        data: user,
        // @ts-expect-error custom library flag stripped at runtime
        ignoreMultitenancy: true,
      });

      await contextManager.run({ accountId: 1 }, async () => {
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

      await prisma.user.create({
        data: user,
        // @ts-expect-error custom library flag stripped at runtime
        ignoreMultitenancy: true,
      });

      await contextManager.run({ accountId: 2 }, async () => {
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

    it("should scope findUnique to the current tenant", async () => {
      await prisma.user.create({
        data: {
          id: 1,
          name: "Tenant One",
          email: "one@example.com",
          account_id: 1,
        },
        // @ts-expect-error custom library flag stripped at runtime
        ignoreMultitenancy: true,
      });

      await contextManager.run({ accountId: 2 }, async () => {
        const retrievedUser = await prisma.user.findUnique({
          where: { email: "one@example.com" },
        });

        expect(retrievedUser).toBeNull();
      });

      await contextManager.run({ accountId: 1 }, async () => {
        const retrievedUser = await prisma.user.findUnique({
          where: { email: "one@example.com" },
        });

        expect(retrievedUser?.account_id).toBe(1);
      });
    });

    it("should scope count to the current tenant", async () => {
      await prisma.user.createMany({
        data: [
          {
            name: "A",
            email: "a@example.com",
            account_id: 1,
          },
          {
            name: "B",
            email: "b@example.com",
            account_id: 2,
          },
        ],
        // @ts-expect-error custom library flag stripped at runtime
        ignoreMultitenancy: true,
      });

      await contextManager.run({ accountId: 1 }, async () => {
        const total = await prisma.user.count();

        expect(total).toBe(1);
      });
    });
  });

  describe("create", () => {
    it("should create with the correct account_id", async () => {
      const accountId = 7;
      const dummyAccountId = 17;

      await contextManager.run({ accountId }, async () => {
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

    it("should create and override account_id when ignoreMultitenancy is true", async () => {
      const accountId = 7;
      const dummyAccountId = 17;

      await contextManager.run({ accountId }, async () => {
        await prisma.user.create({
          data: {
            id: 1,
            name: "Shaul Zuarets",
            email: "shaul@zuarets.io",
            account_id: dummyAccountId,
          },
          // @ts-expect-error custom library flag stripped at runtime
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

    it("should scope createMany rows to the current tenant", async () => {
      await contextManager.run({ accountId: 5 }, async () => {
        await prisma.user.createMany({
          data: [
            {
              name: "One",
              email: "one@example.com",
              account_id: 99,
            },
            {
              name: "Two",
              email: "two@example.com",
              account_id: 99,
            },
          ],
        });

        const users = await prisma.user.findMany();

        expect(users).toHaveLength(2);
        expect(users.every((user) => user.account_id === 5)).toBe(true);
      });
    });
  });

  describe("fail closed", () => {
    it("should throw MissingTenantContextError without tenant context", async () => {
      await expect(
        prisma.user.findMany({
          where: { id: 1 },
        }),
      ).rejects.toBeInstanceOf(MissingTenantContextError);
    });

    it("should accept string tenant ids when coerced for Int fields", async () => {
      await contextManager.run({ accountId: "3" }, async () => {
        await prisma.user.create({
          data: {
            name: "String Tenant",
            email: "string@example.com",
            account_id: 1,
          },
        });

        const users = await prisma.user.findMany();

        expect(users).toHaveLength(1);
        expect(users[0]?.account_id).toBe(3);
      });
    });
  });
});
