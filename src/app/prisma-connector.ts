import { Prisma } from "@prisma/client";

import contextManager from "app/context-manager";
import { MissingTenantContextError } from "app/errors";
import type { TenantId, WithMultitenancyOptions } from "app/types";

const WHERE_ACTIONS = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "findUnique",
  "findUniqueOrThrow",
  "update",
  "updateMany",
  "upsert",
  "delete",
  "deleteMany",
  "count",
  "aggregate",
  "groupBy",
]);

const CREATE_ACTIONS = new Set(["create", "createMany", "upsert"]);

type QueryArgs = Record<string, unknown> & {
  where?: Record<string, unknown>;
  data?: Record<string, unknown> | Record<string, unknown>[];
  create?: Record<string, unknown>;
  update?: Record<string, unknown>;
  ignoreMultitenancy?: boolean;
};

type ScopeContext = {
  queryArgs: QueryArgs;
  tenantField: string;
  tenantId: TenantId;
  operation: string;
};

function getModelField(modelName: string, fieldName: string) {
  const matchedModel = Prisma.dmmf.datamodel.models.find(
    (model) => model.name === modelName,
  );

  if (!matchedModel) {
    return undefined;
  }

  return matchedModel.fields.find((field) => field.name === fieldName);
}

/**
 * Returns true when the Prisma model has the given tenant field.
 */
export function isTenantFieldExists(
  modelName: string,
  fieldName: string,
): boolean {
  return Boolean(getModelField(modelName, fieldName));
}

function stripIgnoreFlag(queryArgs: QueryArgs): boolean {
  if (queryArgs.ignoreMultitenancy === undefined) {
    return false;
  }

  const shouldIgnore = Boolean(queryArgs.ignoreMultitenancy);

  delete queryArgs.ignoreMultitenancy;

  return shouldIgnore;
}

function getTenantId(modelName: string, tenantField: string): TenantId {
  const store = contextManager.getStore();

  if (
    !store ||
    store.accountId === undefined ||
    store.accountId === null ||
    store.accountId === ""
  ) {
    throw new MissingTenantContextError();
  }

  const field = getModelField(modelName, tenantField);
  const value = store.accountId;

  if (field && (field.type === "Int" || field.type === "BigInt")) {
    if (typeof value === "number") {
      return value;
    }

    const parsed = Number.parseInt(String(value), 10);

    if (Number.isNaN(parsed)) {
      throw new MissingTenantContextError(
        `Tenant ID "${String(value)}" is not a valid integer for field "${tenantField}".`,
      );
    }

    return parsed;
  }

  return value;
}

function injectWhere(scope: ScopeContext): void {
  if (!scope.queryArgs.where) {
    scope.queryArgs.where = {};
  }

  scope.queryArgs.where[scope.tenantField] = scope.tenantId;
}

function injectCreateData(scope: ScopeContext): void {
  const { queryArgs, tenantField, tenantId, operation } = scope;

  if (operation === "createMany") {
    if (!queryArgs.data) {
      queryArgs.data = [];
    }

    if (Array.isArray(queryArgs.data)) {
      queryArgs.data = queryArgs.data.map((item) => {
        return {
          ...item,
          [tenantField]: tenantId,
        };
      });
    }

    return;
  }

  if (operation === "upsert") {
    if (!queryArgs.create) {
      queryArgs.create = {};
    }

    if (!queryArgs.update) {
      queryArgs.update = {};
    }

    queryArgs.create[tenantField] = tenantId;
    queryArgs.update[tenantField] = tenantId;

    return;
  }

  if (!queryArgs.data) {
    queryArgs.data = {};
  }

  if (!Array.isArray(queryArgs.data)) {
    queryArgs.data[tenantField] = tenantId;
  }
}

function applyMultitenancy(
  modelName: string,
  scope: Omit<ScopeContext, "tenantId">,
): void {
  const tenantId = getTenantId(modelName, scope.tenantField);
  const fullScope: ScopeContext = { ...scope, tenantId };

  if (WHERE_ACTIONS.has(scope.operation)) {
    injectWhere(fullScope);
  }

  if (CREATE_ACTIONS.has(scope.operation)) {
    injectCreateData(fullScope);
  }
}

/**
 * Prisma Client Extension that automatically scopes queries to the current
 * tenant stored in AsyncLocalStorage.
 *
 * @example
 * ```ts
 * const prisma = new PrismaClient().$extends(
 *   withMultitenancy({ tenantField: "account_id" }),
 * );
 * ```
 */
export function withMultitenancy(options: WithMultitenancyOptions = {}) {
  const tenantField = options.tenantField ?? "account_id";

  return Prisma.defineExtension((client) =>
    client.$extends({
      name: "node-express-multitenant",
      query: {
        $allModels: {
          $allOperations({ model, operation, args, query }) {
            const queryArgs = (args ?? {}) as QueryArgs;
            const shouldIgnore = stripIgnoreFlag(queryArgs);

            if (
              shouldIgnore ||
              !model ||
              !isTenantFieldExists(model, tenantField)
            ) {
              return query(queryArgs);
            }

            applyMultitenancy(model, {
              queryArgs,
              tenantField,
              operation,
            });

            if (
              operation === "findUnique" ||
              operation === "findUniqueOrThrow"
            ) {
              // findUnique cannot accept non-unique fields in `where`, so rewrite
              // to findFirst on the parent client (avoids extension recursion).
              const modelDelegate = (
                client as unknown as Record<
                  string,
                  Record<string, (operationArgs: QueryArgs) => Promise<unknown>>
                >
              )[uncapitalize(model)];
              const rewrittenOperation =
                operation === "findUnique" ? "findFirst" : "findFirstOrThrow";

              return modelDelegate[rewrittenOperation](queryArgs);
            }

            return query(queryArgs);
          },
        },
      },
    }),
  );
}

function uncapitalize(value: string): string {
  return `${value.charAt(0).toLowerCase()}${value.slice(1)}`;
}
