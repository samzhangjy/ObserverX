import ObserverX, {
  MessageRole,
  Middleware,
  MiddlewarePostFunctionCallInfo,
  MiddlewarePreFunctionCallInfo,
  MiddlewarePostFunctionCallProcessorReturns,
  MiddlewarePreFunctionCallProcessorReturns,
  MiddlewarePreProcessorReturns,
  MiddlewareCause,
} from '@observerx/core';
import { ChatInput } from '@observerx/core/dist/connector.js';

class UserInfoMiddleware extends Middleware {
  private userTurns: number = 0;

  private isUpdatingUserInfo: boolean = false;

  private readonly INFO_UPDATE_DELTA = 8;

  private hasFinishedFunction: boolean = false;

  private hasFinishedProcess: boolean = false;

  public async preProcess(
    _payload: ChatInput | null,
    cause: MiddlewareCause,
    bot: ObserverX,
  ): Promise<MiddlewarePreProcessorReturns> {
    if (cause === 'message') {
      this.userTurns += 1;
    }
    // remind bot to update user information
    if (this.userTurns >= this.INFO_UPDATE_DELTA) {
      await bot.createMessage({
        role: MessageRole.SYSTEM,
        content:
          "Please update user(s)'s personality traits, hobbies and other things according to your conversation. Do not reply to this message.",
      });
      this.userTurns = 0;
      this.isUpdatingUserInfo = true;
      const shouldReply = this.hasFinishedProcess;
      this.hasFinishedProcess = false;
      this.hasFinishedFunction = false;
      return {
        result: {
          type: 'update-info',
        },
        stopCurrentReply: shouldReply,
      };
    }
    return undefined;
  }

  public postProcess() {
    if (this.hasFinishedFunction) {
      this.hasFinishedProcess = true;
    }
  }

  public preFunctionCall(
    func: MiddlewarePreFunctionCallInfo,
  ): MiddlewarePreFunctionCallProcessorReturns {
    if (func.name !== 'update_user_info') return {};
    return {
      result: {
        type: 'update-info-action',
        actionArgs: func.args,
        actionName: func.name,
      },
    };
  }

  public postFunctionCall(
    func: MiddlewarePostFunctionCallInfo,
  ): MiddlewarePostFunctionCallProcessorReturns {
    if (func.name !== 'update_user_info') return {};
    this.hasFinishedFunction = true;
    return {
      result: {
        type: 'update-info-result',
        result: func.response,
      },
    };
  }
}

export default UserInfoMiddleware;
