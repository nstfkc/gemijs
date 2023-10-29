import { Request, Response } from "express";
import { Controller } from "./Controller";

interface RouterContext<T> {
  req: Request;
  res: Response;
  params: T;
}

type ClassMethodNames<T> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

export function view<T extends Controller, K extends ClassMethodNames<T>>(
  viewPath: string,
  [Controller, methodName]: [{ new (): T }, K],
) {
  return {
    exec: (ctx: RouterContext<unknown[]>) => {
      const { req, res, params } = ctx;
      const instance = new Controller();
      const method = instance[methodName];

      const data = method({ params });

      if (typeof data === "function") {
        const result = data(req, res);
        return { data: result, viewPath };
      }
      return { data, viewPath };
    },
    json: false,
    method: "GET",
    viewPath,
  };
}

export function get<T extends Controller>(
  Controller: { new (): T },
  methodName: ClassMethodNames<T>,
) {
  return {
    exec: (ctx: RouterContext<any[]>) => {
      const { params } = ctx;
      const controllerInstance = new Controller();
      const method = controllerInstance[methodName];
      if (typeof method === "function") {
        return { data: method({ params }) };
      }
    },
    json: true,
    method: "GET",
  };
}

export function post<T extends Controller>(
  Controller: { new (): T },
  methodName: ClassMethodNames<T>,
) {
  return {
    exec: (ctx: RouterContext<any[]>) => {
      const { params, req } = ctx;
      const instance = new Controller();
      const method = instance[methodName];
      if (typeof method === "function") {
        return { data: method({ body: req.body, params }) };
      }
    },
    json: true,
    method: "POST",
  };
}

export const Route = {
  view,
  get,
  post,
};
