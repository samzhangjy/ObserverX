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

  public async invoke(
    params: ActionParameters,
    bot: ObserverX,
  ): Promise<ReturnType<T> | { status: 'error'; error: string }> {
    try {
      // eslint-disable-next-line @typescript-eslint/return-await
      return await this.action(params, bot);
    } catch (e) {
      return {
        status: 'error',
        error: e.toString(),
      };
    }
  }
}

export enum ActionBaseStatus {
  SUCCESS = 'success',
  ERROR = 'error',
}

export type ActionBundle = Action[];

export default Action;
