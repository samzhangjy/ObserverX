import runNodeCodeAction from './node.js';
import Action from './action.js';
import { getUserInfoAction, updateUserInfoAction } from './user-info.js';
import { searchChatHistoryAction, getMessageAction } from './history.js';
import getCurrentTimeAction from './time.js';

const actionInstances = [
  runNodeCodeAction,
  updateUserInfoAction,
  getUserInfoAction,
  searchChatHistoryAction,
  getMessageAction,
  getCurrentTimeAction,
];

export const actions = actionInstances.map((action) => action.doc);

export const actionMap: Record<string, Action> = actionInstances.reduce(
  (o, action) => ({ ...o, [action.doc.name]: action }),
  {},
);
