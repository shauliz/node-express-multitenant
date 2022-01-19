const { AsyncLocalStorage } = require("async_hooks");

let asyncLocalStorage;

function getContextManager() {
  if (!asyncLocalStorage) {
    asyncLocalStorage = new AsyncLocalStorage();
  }

  return asyncLocalStorage;
}

module.exports = getContextManager;
