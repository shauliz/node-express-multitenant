import { AsyncLocalStorage } from "node:async_hooks";

import type { TenantContext } from "app/types";

const contextManager = new AsyncLocalStorage<TenantContext>();

export default contextManager;
