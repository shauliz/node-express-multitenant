export type TenantId = string | number;

export type TenantContext = {
  accountId: TenantId;
};

export type AccountIdExtractor = (
  request: import("express").Request,
) => TenantId | undefined | null;

export type WithMultitenancyOptions = {
  /**
   * Name of the tenant column on Prisma models.
   * @default "account_id"
   */
  tenantField?: string;
};

/**
 * Custom Prisma query argument used to bypass automatic tenant scoping.
 * Stripped before the query reaches Prisma.
 */
export type MultitenancyQueryArgs = {
  ignoreMultitenancy?: boolean;
};
