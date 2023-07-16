import { ChatCompletionFunctions } from 'openai';

class Action<T extends (...args: any[]) => any = (...args: any[]) => any> {
  constructor(public doc: ChatCompletionFunctions, private action: T) {}

  public invoke(...args: Parameters<T>): ReturnType<T> {
    return this.action(...args);
  }
}

export enum ActionBaseStatus {
  SUCCESS = 'success',
  ERROR = 'error',
}

export default Action;
