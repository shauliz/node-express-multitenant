import { AsyncLocalStorage } from "async_hooks";

let asyncLocalStorage;

export function getContextManager() {
  if (!asyncLocalStorage) {
    asyncLocalStorage = new AsyncLocalStorage();
  }

  return asyncLocalStorage;
}
