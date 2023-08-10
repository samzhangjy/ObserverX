import runNodeCodeAction from './node.js';
import Action from './action.js';
import { getUserInfoAction, updateUserInfoAction } from './user-info.js';
import { searchChatHistoryAction, getMessageAction } from './history.js';
import getCurrentTimeAction from './time.js';
import { changeBotModelAction, getBotModelAction } from './bot-info.js';

const defaultActionInstances = [
  runNodeCodeAction,
  updateUserInfoAction,
  getUserInfoAction,
  searchChatHistoryAction,
  getMessageAction,
  getCurrentTimeAction,
  getBotModelAction,
  changeBotModelAction,
];

export const actions = defaultActionInstances.map((action) => action.doc);

export const actionMap: Record<string, Action> = defaultActionInstances.reduce(
  (o, action) => ({ ...o, [action.doc.name]: action }),
  {},
);

export function addAction(action: Action) {
  actions.push(action.doc);
  actionMap[action.doc.name] = action;
}
