/* eslint-disable no-underscore-dangle */
import Middleware from './middleware.js';

class MiddlewareManager {
  private readonly _middlewares: Middleware[];

  constructor(middlewares: (typeof Middleware)[] = []) {
    this._middlewares = middlewares.map((Cur) => new Cur());
  }

  public async addMiddleware(ToAdd: typeof Middleware) {
    const middleware = new ToAdd();
    await middleware.initialize();
    this._middlewares.push(middleware);
  }

  public async addMiddlewares(...toAdd: (typeof Middleware)[]) {
    for (const middleware of toAdd) {
      // eslint-disable-next-line no-await-in-loop
      await this.addMiddleware(middleware);
    }
  }

  public get middlewares(): Middleware[] {
    return this._middlewares;
  }
}

export default MiddlewareManager;
