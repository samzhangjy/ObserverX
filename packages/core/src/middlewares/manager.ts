/* eslint-disable no-underscore-dangle */
import Middleware, { MiddlewareClassType } from './middleware.js';

class MiddlewareManager {
  private readonly _middlewares: Middleware[];

  constructor(middlewares: MiddlewareClassType[] = []) {
    this._middlewares = middlewares.map((Cur) => new Cur());
  }

  public addMiddleware(ToAdd: MiddlewareClassType) {
    this._middlewares.push(new ToAdd());
  }

  public addMiddlewares(...toAdd: MiddlewareClassType[]) {
    toAdd.forEach((middleware) => this.addMiddleware(middleware));
  }

  public get middlewares(): Middleware[] {
    return this._middlewares;
  }
}

export default MiddlewareManager;
