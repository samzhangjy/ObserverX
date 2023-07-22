import 'dotenv/config';
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { DeepPartial, Repository } from 'typeorm';
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

/**
 * Chat result for each turn.
 */
export interface ChatResult {
  /**
   * Type of the chat result.
   */
  type:
    | 'action'
    | 'action-result'
    | 'message'
    | 'update-info'
    | 'update-info-result'
    | 'update-info-action';

  /**
   * Action arguments.
   */
  actionArgs?: Record<string, any>;

  /**
   * Action name.
   */
  actionName?: string;

  /**
   * Action result.
   */
  result?: Record<string, any>;

  /**
   * Message content.
   */
  content?: string;
}

type ChatInner = AsyncGenerator<ChatResult, void | null | ChatInner>;

/**
 * ObserverX core.
 */
class Bot {
  private history: RuntimeHistory[] = [];

  private currentPrompt: string | null = null;

  private readonly configuration: Configuration;

  private readonly openai: OpenAIApi;

  private userTurns: number = 0;

  private isUpdatingUserInfo: boolean = false;

  private readonly INFO_UPDATE_DELTA = 8;

  private readonly messageRepository: Repository<Message> = dataSource.getRepository(Message);

  /**
   * Create a new bot.
   * @param prompt Bot prompt to use.
   * @param model Bot model to use.
   */
  constructor(private prompt: BotPrompt = 'default', private model: BotModel = 'GPT-3.5') {
    this.loadPrompt();
    this.configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
      basePath: process.env.OPENAI_BASE_PATH ?? 'https://api.openai.com/v1',
    });
    this.openai = new OpenAIApi(this.configuration);
    // give bot an overview of the user at the beginning
    actionMap.get_user_info.invoke().then((data) => {
      this.history.push(
        new RuntimeHistory('function', data, new Date(), undefined, 'get_user_info'),
      );
    });
  }

  /**
   * Chat with the bot.
   * @param message The message to send to the bot.
   */
  public async chat(message: string): Promise<ChatInner | string> {
    this.userTurns += 1;
    try {
      return this.chatInner(message);
    } catch (e) {
      return `[ObserverX] An unexpected error occurred: ${e.toString()}.`;
    }
  }

  /**
   * Create a message record in the database and add it to local history.
   * @param message Message object to create.
   * @private
   */
  private async createMessage(message: DeepPartial<Message>) {
    const messageRecord = this.messageRepository.create(message);
    await this.messageRepository.save(messageRecord);
    this.history.push(RuntimeHistory.fromMessage(messageRecord));
  }

  /**
   * Inner chat logic.
   * @param message The message to send to the bot.
   * @private
   */
  private async *chatInner(message: string | null): ChatInner {
    // remind bot to update user information
    if (this.userTurns >= this.INFO_UPDATE_DELTA) {
      yield {
        type: 'update-info',
      };
      await this.createMessage({
        role: MessageRole.SYSTEM,
        content:
          "Please update user's personality traits, hobbies and other things according to your conversation.",
      });
      this.userTurns = 0;
      this.isUpdatingUserInfo = true;
      return yield* this.chatInner(null);
    }

    if (message !== null) {
      await this.createMessage({
        role: MessageRole.USER,
        content: message,
      });
    }

    const reply = (await this.getNextMessage(this.getChatCompletionRequest())).data.choices[0];
    const replyContent = reply.message.content;
    await this.createMessage({
      role: MessageRole.ASSISTANT,
      content: replyContent,
      action: reply.message.function_call,
    });

    // function call handling
    if (reply.message.function_call) {
      const actionName = reply.message.function_call.name;
      const actionArgs = JSON.parse(reply.message.function_call.arguments);
      const action = actionMap[actionName];

      yield {
        type: this.isUpdatingUserInfo ? 'update-info-action' : 'action',
        actionArgs,
        actionName,
      };

      // IMPORTANT: `actionResponse` MUST NOT be falsy or OpenAI will throw a remote error
      const actionResponse = (await action.invoke(actionArgs)) ?? 'success';
      await this.createMessage({
        role: MessageRole.FUNCTION,
        content: actionResponse,
        actionName,
      });

      yield {
        type: this.isUpdatingUserInfo ? 'update-info-result' : 'action-result',
        result: actionResponse,
      };

      if (this.isUpdatingUserInfo) {
        this.isUpdatingUserInfo = false;
      }

      return yield* this.chatInner(null);
    }

    return (yield {
      type: 'message',
      content: replyContent,
    }) as void;
  }

  /**
   * Load the prompt from the file system.
   * @private
   */
  private loadPrompt() {
    const promptPath = path.resolve(`./prompts/${this.prompt}.md`);
    if (!fs.existsSync(promptPath)) return;
    this.currentPrompt = fs.readFileSync(promptPath, { encoding: 'utf-8' });
  }

  /**
   * Builds chat history in OpenAI required format.
   * @private
   */
  private getChatCompletionRequest(): ChatCompletionRequestMessage[] {
    return [
      { role: 'system', content: this.currentPrompt },
      { role: 'system', content: `It is now ${new Date().toString()}.` },
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

  /**
   * Get the next message from OpenAI.
   * @param messages Message history in OpenAI required format.
   * @private
   */
  private async getNextMessage(messages: ChatCompletionRequestMessage[]) {
    return this.openai.createChatCompletion({
      model: modelMap[this.model],
      messages,
      functions: actions,
    });
  }
}

export default Bot;
