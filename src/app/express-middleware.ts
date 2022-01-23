import { getContextManager } from "./context-manager";

const contextManager = getContextManager();

export function getMultitenancyMiddleware(accountIdExtractor) {
  if (!accountIdExtractor) {
    accountIdExtractor = defaultAccountIdExtractor;
  }

  return (req, res, next) => {
    const data = { accountId: accountIdExtractor(req) };

    contextManager.run(data, () => {
      next();
    });
  };
}

function defaultAccountIdExtractor(req) {
  return req.headers["account-id"];
}