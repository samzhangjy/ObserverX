import { DataSource } from 'typeorm';
import { BotModel } from '../config.js';

export interface ActionConfig {
  model: BotModel;
  parentId: string;
  dataSource: DataSource;
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

export interface ActionProperties {
  type: 'string' | 'number';
  description: string;
}

export interface ActionDoc<T extends string = string> {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<T, ActionProperties>;
    required: (keyof ActionDoc['parameters']['properties'])[];
  };
}

class Action<T extends ActionInvoker = ActionInvoker, U extends string = string> {
  constructor(
    public doc: ActionDoc<U>,
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
