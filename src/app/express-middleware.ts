import type { NextFunction, Request, Response } from "express";

import contextManager from "app/context-manager";
import type { AccountIdExtractor, TenantId } from "app/types";

function defaultAccountIdExtractor(request: Request): TenantId | undefined {
  const headerValue = request.headers["account-id"];

  if (Array.isArray(headerValue)) {
    return headerValue[0];
  }

  return headerValue;
}

/**
 * Express middleware factory that extracts a tenant ID per request and stores
 * it in AsyncLocalStorage for the remainder of the request lifecycle.
 *
 * Pass a secure extractor (e.g. from a verified JWT). The default reads the
 * `account-id` request header and is not secure on its own.
 */
export default function getMultitenancyMiddleware(
  accountIdExtractor: AccountIdExtractor = defaultAccountIdExtractor,
) {
  return function multitenancyMiddleware(
    request: Request,
    _response: Response,
    next: NextFunction,
  ): void {
    const accountId = accountIdExtractor(request);
    const data = { accountId: accountId as TenantId };

    contextManager.run(data, () => {
      next();
    });
  };
}
