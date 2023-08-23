/* eslint-disable @typescript-eslint/no-unused-vars */
import type ObserverX from '../connector.js';
import { type ChatResult, type ChatInput } from '../connector.js';

export interface MiddlewarePreFunctionCallInfo {
  name: string;
  args: Record<string, any>;
}

export interface MiddlewarePostFunctionCallInfo {
  name: string;
  args: Record<string, any>;
  response: any;
}

export interface IMiddlewareProcessorReturns {
  result?: ChatResult;
}

export interface IMiddlewarePreProcessorReturns extends IMiddlewareProcessorReturns {
  stopCurrentReply?: boolean;
}

export interface IMiddlewarePostProcessorReturns extends IMiddlewareProcessorReturns {}

export interface IMiddlewarePreFunctionCallProcessorReturns extends IMiddlewareProcessorReturns {}

export interface IMiddlewarePostFunctionCallProcessorReturns extends IMiddlewareProcessorReturns {}

type PossiblePromise<T> = T | Promise<T>;

export type MiddlewareProcessorReturns<
  T extends IMiddlewareProcessorReturns = IMiddlewareProcessorReturns,
> = T | void;

export type MiddlewarePreProcessorReturns =
  MiddlewareProcessorReturns<IMiddlewarePreProcessorReturns>;

export type MiddlewarePostProcessorReturns =
  MiddlewareProcessorReturns<IMiddlewarePostProcessorReturns>;

export type MiddlewarePreFunctionCallProcessorReturns =
  MiddlewareProcessorReturns<IMiddlewarePreFunctionCallProcessorReturns>;

export type MiddlewarePostFunctionCallProcessorReturns =
  MiddlewareProcessorReturns<IMiddlewarePostFunctionCallProcessorReturns>;

export type MiddlewareCause = 'message' | 'function';

class Middleware {
  initialize(): PossiblePromise<void> {}

  preProcess(
    payload: ChatInput | null,
    cause: MiddlewareCause,
    bot: ObserverX,
  ): PossiblePromise<MiddlewarePreProcessorReturns> {}

  postProcess(
    payload: ChatInput | null,
    cause: MiddlewareCause,
    bot: ObserverX,
  ): PossiblePromise<MiddlewarePostProcessorReturns> {}

  preFunctionCall(
    func: MiddlewarePreFunctionCallInfo,
    bot: ObserverX,
  ): PossiblePromise<MiddlewarePreFunctionCallProcessorReturns> {}

  postFunctionCall(
    func: MiddlewarePostFunctionCallInfo,
    bot: ObserverX,
  ): PossiblePromise<MiddlewarePostFunctionCallProcessorReturns> {}
}

export default Middleware;
