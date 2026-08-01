import contextManager from "app/context-manager";
import getDb from "app/prisma/prisma-client";

describe("multitenancy writes", () => {
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

  describe("update and delete", () => {
    it("should only updateMany rows for the current tenant", async () => {
      await prisma.user.create({
        data: {
          id: 1,
          name: "Original",
          email: "update@example.com",
          account_id: 1,
        },
        // @ts-expect-error custom library flag stripped at runtime
        ignoreMultitenancy: true,
      });

      await contextManager.run({ accountId: 2 }, async () => {
        const result = await prisma.user.updateMany({
          where: { email: "update@example.com" },
          data: { name: "Hacked" },
        });

        expect(result.count).toBe(0);
      });

      await contextManager.run({ accountId: 1 }, async () => {
        await prisma.user.updateMany({
          where: { email: "update@example.com" },
          data: { name: "Updated" },
        });

        const user = await prisma.user.findFirst({
          where: { email: "update@example.com" },
        });

        expect(user?.name).toBe("Updated");
      });
    });

    it("should scope singular update to the current tenant", async () => {
      await prisma.user.create({
        data: {
          email: "singular-update@example.com",
          name: "Original",
          account_id: 1,
        },
        // @ts-expect-error custom library flag stripped at runtime
        ignoreMultitenancy: true,
      });

      await contextManager.run({ accountId: 2 }, async () => {
        await expect(
          prisma.user.update({
            where: { email: "singular-update@example.com" },
            data: { name: "Hacked" },
          }),
        ).rejects.toThrow(/No record was found for an update/u);
      });

      await contextManager.run({ accountId: 1 }, async () => {
        const user = await prisma.user.update({
          where: { email: "singular-update@example.com" },
          data: { name: "Updated" },
        });

        expect(user.name).toBe("Updated");
        expect(user.account_id).toBe(1);
      });
    });

    it("should only deleteMany rows for the current tenant", async () => {
      await prisma.user.create({
        data: {
          id: 1,
          name: "Keep",
          email: "keep@example.com",
          account_id: 1,
        },
        // @ts-expect-error custom library flag stripped at runtime
        ignoreMultitenancy: true,
      });

      await contextManager.run({ accountId: 2 }, async () => {
        const result = await prisma.user.deleteMany({
          where: { email: "keep@example.com" },
        });

        expect(result.count).toBe(0);
      });

      await contextManager.run({ accountId: 1 }, async () => {
        const result = await prisma.user.deleteMany({
          where: { email: "keep@example.com" },
        });

        expect(result.count).toBe(1);
      });
    });

    it("should scope singular delete to the current tenant", async () => {
      await prisma.user.create({
        data: {
          email: "singular-delete@example.com",
          name: "Keep",
          account_id: 1,
        },
        // @ts-expect-error custom library flag stripped at runtime
        ignoreMultitenancy: true,
      });

      await contextManager.run({ accountId: 2 }, async () => {
        await expect(
          prisma.user.delete({
            where: { email: "singular-delete@example.com" },
          }),
        ).rejects.toThrow(/No record was found for a delete/u);
      });

      await contextManager.run({ accountId: 1 }, async () => {
        const user = await prisma.user.delete({
          where: { email: "singular-delete@example.com" },
        });

        expect(user.account_id).toBe(1);
      });
    });
  });

  describe("upsert aggregate groupBy", () => {
    it("should upsert with the current tenant on create", async () => {
      await contextManager.run({ accountId: 4 }, async () => {
        const user = await prisma.user.upsert({
          where: { email: "upsert@example.com" },
          create: {
            email: "upsert@example.com",
            name: "Created",
            account_id: 99,
          },
          update: { name: "Updated" },
        });

        expect(user.account_id).toBe(4);
        expect(user.name).toBe("Created");
      });
    });

    it("should not update another tenant row via upsert", async () => {
      await prisma.user.create({
        data: {
          email: "upsert-other@example.com",
          name: "Other",
          account_id: 1,
        },
        // @ts-expect-error custom library flag stripped at runtime
        ignoreMultitenancy: true,
      });

      await contextManager.run({ accountId: 2 }, async () => {
        // Tenant-scoped where does not match the other tenant's row.
        // Prisma then attempts create; with a global unique on email this
        // fails — either way the other tenant's row is not updated.
        await expect(
          prisma.user.upsert({
            where: { email: "upsert-other@example.com" },
            create: {
              email: "upsert-other@example.com",
              name: "Created for two",
              account_id: 99,
            },
            update: { name: "Hacked" },
          }),
        ).rejects.toThrow();
      });

      await contextManager.run({ accountId: 1 }, async () => {
        const original = await prisma.user.findUnique({
          where: { email: "upsert-other@example.com" },
        });

        expect(original?.name).toBe("Other");
        expect(original?.account_id).toBe(1);
      });
    });

    it("should scope aggregate and groupBy to the current tenant", async () => {
      await prisma.user.createMany({
        data: [
          { email: "agg1@example.com", name: "A", account_id: 1 },
          { email: "agg2@example.com", name: "B", account_id: 2 },
        ],
        // @ts-expect-error custom library flag stripped at runtime
        ignoreMultitenancy: true,
      });

      await contextManager.run({ accountId: 1 }, async () => {
        const aggregate = await prisma.user.aggregate({
          _count: true,
        });
        const groups = await prisma.user.groupBy({
          by: ["account_id"],
          _count: true,
        });

        expect(aggregate._count).toBe(1);
        expect(groups).toStrictEqual([{ account_id: 1, _count: 1 }]);
      });
    });

    it("should throw from findUniqueOrThrow for another tenant", async () => {
      await prisma.user.create({
        data: {
          email: "throw@example.com",
          name: "Owner",
          account_id: 1,
        },
        // @ts-expect-error custom library flag stripped at runtime
        ignoreMultitenancy: true,
      });

      await contextManager.run({ accountId: 2 }, async () => {
        await expect(
          prisma.user.findUniqueOrThrow({
            where: { email: "throw@example.com" },
          }),
        ).rejects.toThrow(/No record was found/u);
      });
    });
  });
});
