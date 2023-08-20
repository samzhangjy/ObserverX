import type ObserverX from '../connector.js';

export interface ActionParameters {
  [key: string]: any;
}

export type ActionInvoker<T extends ActionParameters = ActionParameters, U extends any = any> = (
  params: T,
  bot: ObserverX,
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

  public invoke(params: ActionParameters, bot: ObserverX): ReturnType<T> {
    return this.action(params, bot);
  }
}

export enum ActionBaseStatus {
  SUCCESS = 'success',
  ERROR = 'error',
}

export type ActionBundle = Action[];

export default Action;
