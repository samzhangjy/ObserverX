import { ActionBundle } from '@observerx/core';
import userInfoActions from './user-info.js';
import findUserActions from './find-user.js';

const actions: ActionBundle = [...userInfoActions, ...findUserActions];

export default actions;
