import { Plugin } from '@observerx/core';
import actions from './actions/index.js';
import middlewares from './middlewares/index.js';

const pluginUserInfo: Plugin = {
  actions,
  middlewares,
};

export default pluginUserInfo;
