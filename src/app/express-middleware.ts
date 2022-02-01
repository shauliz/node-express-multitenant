import contextManager from "app/context-manager";

export default function getMultitenancyMiddleware(accountIdExtractor) {
  if (!accountIdExtractor) {
    accountIdExtractor = defaultAccountIdExtractor;
  }

  const multitenancyMiddleware = (req, res, next) => {
    const data = { accountId: accountIdExtractor(req) };

    contextManager.run(data, () => {
      next();
    });
  };

  return multitenancyMiddleware;
}

function defaultAccountIdExtractor(req) {
  return req.headers["account-id"];
}
