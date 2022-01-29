import { getContextManager } from "app/context-manager";

const contextManager = getContextManager();

export function getMultitenancyMiddleware(accountIdExtractor) {
  if (!accountIdExtractor) {
    accountIdExtractor = defaultAccountIdExtractor;
  }

  return (request, result, next) => {
    const data = { accountId: accountIdExtractor(request) };

    contextManager.run(data, () => {
      next();
    });
  };
}

function defaultAccountIdExtractor(req) {
  return req.headers["account-id"];
}
