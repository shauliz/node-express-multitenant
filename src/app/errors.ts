/**
 * Thrown when a tenant-scoped Prisma operation runs without a tenant in
 * AsyncLocalStorage context. The library fails closed rather than guessing.
 */
export class MissingTenantContextError extends Error {
  constructor(
    message = "Tenant context is missing. Ensure getMultitenancyMiddleware is mounted and the request extractor returned a tenant ID.",
  ) {
    super(message);
    this.name = "MissingTenantContextError";

    Object.setPrototypeOf(this, new.target.prototype);
  }
}
