import { Entity } from '@observerx/database';
import { Middleware } from '../middlewares/index.js';
import { Action } from '../actions/index.js';

class Plugin {
  public middlewares: (typeof Middleware)[] = [];

  public actions: Action[] = [];

  initialize(): void | Promise<void> {}

  static getDatabaseEntities(): Entity[] {
    return [];
  }
}

export default Plugin;
