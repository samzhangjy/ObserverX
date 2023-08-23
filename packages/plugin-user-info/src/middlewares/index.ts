import { Middleware } from '@observerx/core';
import UserInfoMiddleware from './user-info.js';

const middlewares: (typeof Middleware)[] = [UserInfoMiddleware];

export default middlewares;
