import {
  ChatCompletionRequestMessageFunctionCall,
  ChatCompletionRequestMessageRoleEnum,
} from 'openai';
import Message from './entity/Message';

class RuntimeHistory {
  constructor(
    public role: ChatCompletionRequestMessageRoleEnum,
    public content: string,
    public timestamp: Date,
    public action?: ChatCompletionRequestMessageFunctionCall,
    public actionName?: string,
  ) {}

  static fromMessage(message: Message) {
    return new RuntimeHistory(
      message.role,
      message.content,
      message.timestamp,
      message.action,
      message.actionName,
    );
  }
}

export default RuntimeHistory;
