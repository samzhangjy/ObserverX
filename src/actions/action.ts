import { CompletionCreateParams } from 'openai/resources/chat';
import Function = CompletionCreateParams.CreateChatCompletionRequestNonStreaming.Function;
import { BotModel } from '../config';

export interface ActionConfig {
  model: BotModel;
}

export interface ActionParameters {
  [key: string]: any;
}

export type ActionInvoker<T extends ActionParameters = ActionParameters, U extends any = any> = (
  params: T,
  config: ActionConfig,
) => U;

class Action<T extends ActionInvoker = ActionInvoker> {
  constructor(
    public doc: Function,
    private action: T,
  ) {}

  public invoke(params: ActionParameters, config: ActionConfig): ReturnType<T> {
    return this.action(params, config);
  }
}

export enum ActionBaseStatus {
  SUCCESS = 'success',
  ERROR = 'error',
}

export default Action;
