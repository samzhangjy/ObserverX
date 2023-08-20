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
  result: ChatResult;
}

type PossiblePromise<T> = T | Promise<T>;

export type MiddlewareProcessorReturns = IMiddlewareProcessorReturns | void;

interface Middleware {
  preProcess(
    payload: ChatInput | null,
    bot: ObserverX,
  ): PossiblePromise<MiddlewareProcessorReturns>;

  postProcess(
    payload: ChatInput | null,
    bot: ObserverX,
  ): PossiblePromise<MiddlewareProcessorReturns>;

  preFunctionCall(
    func: MiddlewarePreFunctionCallInfo,
    bot: ObserverX,
  ): PossiblePromise<MiddlewareProcessorReturns>;

  postFunctionCall(
    func: MiddlewarePostFunctionCallInfo,
    bot: ObserverX,
  ): PossiblePromise<MiddlewareProcessorReturns>;
}

class MiddlewareClass implements Middleware {
  preProcess(
    payload: ChatInput | null,
    bot: ObserverX,
  ): PossiblePromise<MiddlewareProcessorReturns> {}

  postProcess(
    payload: ChatInput | null,
    bot: ObserverX,
  ): PossiblePromise<MiddlewareProcessorReturns> {}

  preFunctionCall(
    func: MiddlewarePreFunctionCallInfo,
    bot: ObserverX,
  ): PossiblePromise<MiddlewareProcessorReturns> {}

  postFunctionCall(
    func: MiddlewarePostFunctionCallInfo,
    bot: ObserverX,
  ): PossiblePromise<MiddlewareProcessorReturns> {}
}

export type MiddlewareClassType = typeof MiddlewareClass;

export default Middleware;
