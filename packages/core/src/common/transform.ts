import { CreateChatCompletionRequestMessage } from 'openai/resources/chat';
import { DeepPartial } from 'typeorm';
import Message from '../entity/Message.js';

// eslint-disable-next-line import/prefer-default-export
export function transformMessageToOpenAIFormat(
  message: DeepPartial<Message>,
): CreateChatCompletionRequestMessage {
  return {
    role: message.role,
    content:
      message.role === 'function'
        ? JSON.stringify(message.content)
        : message.role === 'user'
        ? JSON.stringify({
            sender: {
              id: message.sender?.id,
              name: message.sender?.name,
            },
            content: message.content,
          })
        : message.content,
    function_call: message.action as CreateChatCompletionRequestMessage.FunctionCall,
    name: message.actionName,
  };
}
