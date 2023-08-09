import { ChatCompletion, CompletionCreateParams } from 'openai/resources/chat';
import Message from './entity/Message.js';
import FunctionCall = CompletionCreateParams.CreateChatCompletionRequestStreaming.Message.FunctionCall;
import User from './entity/User';

class RuntimeHistory {
  constructor(
    public id: number,
    public role: ChatCompletion.Choice.Message['role'],
    public content: string,
    public timestamp: Date,
    public action?: FunctionCall,
    public actionName?: string,
    public tokens?: number,
    public sender?: User,
    public parentId?: string,
  ) {}

  static fromMessage(message: Message) {
    return new RuntimeHistory(
      message.id,
      message.role,
      message.content,
      message.timestamp,
      message.action,
      message.actionName,
      message.tokens,
      message.sender,
      message.parentId,
    );
  }
}

export default RuntimeHistory;
