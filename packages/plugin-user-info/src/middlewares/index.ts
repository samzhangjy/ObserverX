import { MiddlewareClassType } from '@observerx/core';
import UserInfoMiddleware from './user-info.js';

const middlewares: MiddlewareClassType[] = [UserInfoMiddleware];

export default middlewares;
