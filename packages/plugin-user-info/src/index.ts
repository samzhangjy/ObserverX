import { Plugin } from '@observerx/core';
import actions from './actions/index.js';
import middlewares from './middlewares/index.js';
import UserInfo from './entities/UserInfo.js';

class PluginUserInfo extends Plugin {
  public actions = actions;

  public middlewares = middlewares;

  static getDatabaseEntities() {
    return [UserInfo];
  }
}

export default PluginUserInfo;

export { default as UserInfo } from './entities/UserInfo.js';
