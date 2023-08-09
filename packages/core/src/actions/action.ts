import { CompletionCreateParams } from 'openai/resources/chat';
import Function = CompletionCreateParams.CreateChatCompletionRequestNonStreaming.Function;
import { BotModel } from '../config.js';

export interface ActionConfig {
  model: BotModel;
  parentId: string;
}

export interface ActionParameters {
  [key: string]: any;
}

export type ChangeActionConfig = (config: ActionConfig) => void;

export type ActionInvoker<T extends ActionParameters = ActionParameters, U extends any = any> = (
  params: T,
  config: ActionConfig,
  changeConfig: ChangeActionConfig,
) => U;

class Action<T extends ActionInvoker = ActionInvoker> {
  constructor(
    public doc: Function,
    private action: T,
  ) {}

  public invoke(
    params: ActionParameters,
    config: ActionConfig,
    changeConfig: ChangeActionConfig,
  ): ReturnType<T> {
    return this.action(params, config, changeConfig);
  }
}

export enum ActionBaseStatus {
  SUCCESS = 'success',
  ERROR = 'error',
}

export default Action;
