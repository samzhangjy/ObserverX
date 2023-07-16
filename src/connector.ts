import 'dotenv/config';
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { Repository } from 'typeorm';
import RuntimeHistory from './runtime-history.js';
import { actionMap, actions } from './actions/index.js';
import Message, { MessageRole } from './entity/Message.js';
import dataSource from './data-source.js';

export type BotPrompt = 'default';

export type BotModel = 'GPT-3.5' | 'GPT-4';

const modelMap: Record<BotModel, string> = {
  'GPT-3.5': 'gpt-3.5-turbo',
  'GPT-4': 'gpt-4',
};

class Bot {
  private history: RuntimeHistory[] = [];

  private currentPrompt: string | null = null;

  private readonly configuration: Configuration;

  private readonly openai: OpenAIApi;

  private userTurns: number = 0;

  private readonly INFO_UPDATE_DELTA = 5;

  private readonly messageRepository: Repository<Message> = dataSource.getRepository(Message);

  constructor(private prompt: BotPrompt = 'default', private model: BotModel = 'GPT-3.5') {
    this.loadPrompt();
    this.configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
      basePath: 'https://api.chatanywhere.cn/v1',
    });
    this.openai = new OpenAIApi(this.configuration);
    actionMap.get_user_info.invoke().then((data) => {
      this.history.push(
        new RuntimeHistory('function', data, new Date(), undefined, 'get_user_info'),
      );
    });
  }

  public async chat(message: string): Promise<string> {
    this.userTurns += 1;
    try {
      return await this.chatInner(message);
    } catch (e) {
      return `[ObserverX] An unexpected error occurred: ${e.toString()}.`;
    }
  }

  private async chatInner(message: string | null): Promise<string> {
    let messageRecord: Message;
    if (this.userTurns >= this.INFO_UPDATE_DELTA) {
      messageRecord = this.messageRepository.create({
        role: MessageRole.SYSTEM,
        content:
          "Please update user's personality traits, hobbies and other things according to your conversation.",
      });
      await this.messageRepository.save(messageRecord);
      this.history.push(RuntimeHistory.fromMessage(messageRecord));
      this.userTurns = 0;
      await this.chatInner(null);
    }
    if (message !== null) {
      messageRecord = this.messageRepository.create({
        role: MessageRole.USER,
        content: message,
      });
      await this.messageRepository.save(messageRecord);
      this.history.push(RuntimeHistory.fromMessage(messageRecord));
    }
    const reply = (await this.getNextMessage(this.getChatCompletionRequest())).data.choices[0];
    const replyContent = reply.message.content;
    messageRecord = this.messageRepository.create({
      role: MessageRole.ASSISTANT,
      content: replyContent,
      action: reply.message.function_call,
    });
    await this.messageRepository.save(messageRecord);
    this.history.push(RuntimeHistory.fromMessage(messageRecord));
    if (reply.message.function_call) {
      const actionName = reply.message.function_call.name;
      const actionArgs = JSON.parse(reply.message.function_call.arguments);
      const action = actionMap[actionName];
      const actionResponse = await action.invoke(actionArgs);
      messageRecord = this.messageRepository.create({
        role: MessageRole.FUNCTION,
        content: actionResponse ?? 'success',
        actionName,
      });
      await this.messageRepository.save(messageRecord);
      this.history.push(RuntimeHistory.fromMessage(messageRecord));
      return this.chatInner(null);
    }
    return replyContent;
  }

  private loadPrompt() {
    const promptPath = path.resolve(`./prompts/${this.prompt}.md`);
    if (!fs.existsSync(promptPath)) return;
    this.currentPrompt = fs.readFileSync(promptPath, { encoding: 'utf-8' });
  }

  private getChatCompletionRequest(): ChatCompletionRequestMessage[] {
    return [
      { role: 'system', content: this.currentPrompt },
      ...this.history.map((history) => {
        return {
          role: history.role,
          content: history.role === 'function' ? JSON.stringify(history.content) : history.content,
          function_call: history.action,
          name: history.actionName,
        };
      }),
    ];
  }

  private async getNextMessage(messages: ChatCompletionRequestMessage[]) {
    return this.openai.createChatCompletion({
      model: modelMap[this.model],
      messages,
      functions: actions,
    });
  }
}

export default Bot;
