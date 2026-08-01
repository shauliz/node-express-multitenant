import type { NextFunction, Request, Response } from "express";

import contextManager from "app/context-manager";
import getMultitenancyMiddleware from "app/express-middleware";

describe("getMultitenancyMiddleware", () => {
  it("stores the default account-id header in context", () => {
    const middleware = getMultitenancyMiddleware();
    const request = {
      headers: { "account-id": "42" },
    } as unknown as Request;
    const response = {} as Response;
    let captured: unknown;

    middleware(request, response, (() => {
      captured = contextManager.getStore();
    }) as NextFunction);

    expect(captured).toStrictEqual({ accountId: "42" });
  });

  it("uses a custom extractor", () => {
    const middleware = getMultitenancyMiddleware(() => 7);
    const request = { headers: {} } as unknown as Request;
    const response = {} as Response;
    let captured: unknown;

    middleware(request, response, (() => {
      captured = contextManager.getStore();
    }) as NextFunction);

    expect(captured).toStrictEqual({ accountId: 7 });
  });
});
