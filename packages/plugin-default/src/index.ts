import botInfoAction from '@observerx/action-bot-info';
import historyAction from '@observerx/action-history';
import nodeAction from '@observerx/action-node';
import timeAction from '@observerx/action-time';
import { Plugin } from '@observerx/core';

const pluginDefault: Plugin = {
  actions: [...botInfoAction, ...historyAction, ...nodeAction, ...timeAction],
  middlewares: [],
};

export default pluginDefault;
