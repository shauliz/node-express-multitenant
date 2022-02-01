import { AsyncLocalStorage } from "async_hooks";

let contextManager: AsyncLocalStorage<any>;

if (!contextManager) {
  contextManager = new AsyncLocalStorage();
}

export default contextManager;
