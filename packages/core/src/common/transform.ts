import { CompletionCreateParams } from 'openai/resources/chat';
import { DeepPartial } from 'typeorm';
import Message from '../entity/Message.js';
import CreateChatCompletionRequestStreaming = CompletionCreateParams.CreateChatCompletionRequestStreaming;

// eslint-disable-next-line import/prefer-default-export
export function transformMessageToOpenAIFormat(
  message: DeepPartial<Message>,
): CreateChatCompletionRequestStreaming.Message {
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
    function_call: message.action as CreateChatCompletionRequestStreaming.Message.FunctionCall,
    name: message.actionName,
  };
}
