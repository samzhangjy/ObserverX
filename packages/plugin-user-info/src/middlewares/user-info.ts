import ObserverX, {
  MessageRole,
  Middleware,
  MiddlewarePostFunctionCallInfo,
  MiddlewarePreFunctionCallInfo,
  MiddlewareProcessorReturns,
} from '@observerx/core';
import { ChatInput } from '@observerx/core/dist/connector';

class UserInfoMiddleware implements Middleware {
  private userTurns: number = 0;

  private isUpdatingUserInfo: boolean = false;

  private readonly INFO_UPDATE_DELTA = 8;

  public async preProcess(
    payload: ChatInput | null,
    bot: ObserverX,
  ): Promise<MiddlewareProcessorReturns> {
    if (payload) {
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
      return {
        result: {
          type: 'update-info',
        },
      };
    }
    return undefined;
  }

  public postProcess() {}

  public preFunctionCall(func: MiddlewarePreFunctionCallInfo): MiddlewareProcessorReturns {
    return {
      result: {
        type: 'update-info-action',
        actionArgs: func.args,
        actionName: func.name,
      },
    };
  }

  public postFunctionCall(func: MiddlewarePostFunctionCallInfo): MiddlewareProcessorReturns {
    return {
      result: {
        type: 'update-info-result',
        result: func.response,
      },
    };
  }
}

export default UserInfoMiddleware;
