/* eslint-disable no-underscore-dangle */
import Plugin from './plugin.js';
import { Middleware, MiddlewareManager } from '../middlewares/index.js';
import { Action, ActionDoc, ActionManager } from '../actions/index.js';

class PluginManager {
  private readonly _plugins: Plugin[];

  public readonly middlewareManager: MiddlewareManager;

  public readonly actionManager: ActionManager;

  constructor(plugins: Plugin[] = []) {
    this._plugins = plugins;

    this.middlewareManager = new MiddlewareManager(plugins.flatMap((plugin) => plugin.middlewares));
    this.actionManager = new ActionManager(plugins.flatMap((plugin) => plugin.actions));
  }

  public addPlugin(plugin: Plugin) {
    this._plugins.push(plugin);
    this.middlewareManager.addMiddlewares(...plugin.middlewares);
    this.actionManager.addActions(...plugin.actions);
  }

  public addPlugins(...plugins: Plugin[]) {
    plugins.forEach((plugin) => this.addPlugin(plugin));
  }

  public get plugins(): Plugin[] {
    return this._plugins;
  }

  public get actionMap(): Record<string, Action> {
    return this.actionManager.actionMap;
  }

  public get actionDocs(): ActionDoc[] {
    return this.actionManager.actionDocs;
  }

  public get middlewares(): Middleware[] {
    return this.middlewareManager.middlewares;
  }
}

export default PluginManager;
