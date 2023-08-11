import 'dotenv/config';
import OpenAI from 'openai';
import * as fs from 'fs';
import { DataSource, DeepPartial, Repository } from 'typeorm';
import { Chat, CompletionCreateParams } from 'openai/resources/chat';
import { encode } from 'gpt-tokenizer';
import { fileURLToPath } from 'url';
import path from 'path';
import { type Entity } from '@observerx/database';
import RuntimeHistory from './runtime-history.js';
import { actionMap, actions } from './actions/index.js';
import Message, { MessageRole } from './entity/Message.js';
import { BotModel, modelMap } from './config.js';
import { ActionConfig } from './actions/action.js';
import { getTokenCountFromMessage, limitTokensFromMessages } from './common/token-limiter.js';
import { transformMessageToOpenAIFormat } from './common/transform.js';
import User from './entity/User.js';
import CreateChatCompletionRequestStreaming = CompletionCreateParams.CreateChatCompletionRequestStreaming;
import ChatCompletionChunk = Chat.ChatCompletionChunk;
import ChatCompletion = Chat.ChatCompletion;

// eslint-disable-next-line @typescript-eslint/naming-convention,no-underscore-dangle
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type BotPrompt = 'default' | 'private' | 'group';

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
    | 'message-start'
    | 'message-part'
    | 'message-end'
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

export type IChat = ChatInner | string;

export interface ChatInput {
  senderId: string;
  message: string;
}

export interface IObserverX {
  prompt?: BotPrompt;
  model?: BotModel;
  parentId?: string;
  dataSource: DataSource;
}

/**
 * ObserverX core.
 */
class ObserverX {
  public model: BotModel = 'GPT-3.5';

  public parentId: string = 'UNKNOWN';

  private history: RuntimeHistory[] = [];

  private currentPrompt: string | null = null;

  private readonly openai: OpenAI;

  private userTurns: number = 0;

  private isUpdatingUserInfo: boolean = false;

  private readonly INFO_UPDATE_DELTA = 8;

  private readonly messageRepository: Repository<Message>;

  private readonly userRepository: Repository<User>;

  private readonly HISTORY_COUNT_LIMIT: number = parseInt(
    process.env.HISTORY_COUNT_LIMIT ?? '80',
    10,
  );

  private readonly MAX_CONTIGUOUS_FUNCTION_CALLS = 8;

  private readonly prompt: BotPrompt = 'default';

  private readonly dataSource: DataSource;

  /**
   * Create a new bot.
   * @param prompt Bot prompt to use.
   * @param model Bot model to use.
   * @param parentId Conversation parent ID.
   * @param dataSource TypeORM database source to use.
   */
  constructor({
    prompt = 'default',
    model = 'GPT-3.5',
    parentId = 'UNKNOWN',
    dataSource,
  }: IObserverX) {
    this.dataSource = dataSource;
    this.prompt = prompt;
    this.model = model;
    this.parentId = parentId;

    this.messageRepository = this.dataSource.getRepository(Message);
    this.userRepository = this.dataSource.getRepository(User);

    this.loadPrompt();
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_PATH ?? 'https://api.openai.com/v1',
    });

    // load initial history
    this.messageRepository
      .find({
        where: {
          parentId,
        },
        take: this.HISTORY_COUNT_LIMIT,
        order: { timestamp: 'DESC' },
      })
      .then((history) => {
        limitTokensFromMessages(history.reverse(), modelMap[this.model].tokenLimit - 1000).forEach(
          (message) => {
            this.history.push(RuntimeHistory.fromMessage(message));
          },
        );
      });
  }

  private get actionConfig(): ActionConfig {
    return {
      model: this.model,
      parentId: this.parentId,
      dataSource: this.dataSource,
    };
  }

  public static getDatabaseEntities(): Entity[] {
    return [path.join(__dirname, './entity/*.{js,ts}')];
  }

  /**
   * Chat with the bot.
   * @param payload The message to send to the bot.
   */
  public async chat(payload: ChatInput | null): Promise<IChat> {
    this.userTurns += 1;
    try {
      return this.chatInner(payload);
    } catch (e) {
      return `[ObserverX] An unexpected error occurred: ${e.toString()}.`;
    }
  }

  public async addMessageToQueue(payload: ChatInput) {
    await this.createMessage({
      role: MessageRole.USER,
      content: payload.message,
      parentId: this.parentId,
      sender: {
        id: payload.senderId,
      },
    });
  }

  public changeBotConfig(config: ActionConfig) {
    this.model = config.model ?? this.model;
    this.parentId = config.parentId ?? this.parentId;

    // IMPORTANT: prevent overflowing when switching from high-limit models to low-limit models.
    this.history = limitTokensFromMessages(this.history, modelMap[this.model].tokenLimit - 1000);
  }

  /**
   * Create a message record in the database and add it to local history.
   * @param message Message object to create.
   * @private
   */
  private async createMessage(message: DeepPartial<Omit<Message, 'tokens'>>) {
    let sender = await this.userRepository.findOneBy({ id: message.sender?.id ?? '' });
    if (message.sender?.id && !sender) {
      sender = this.userRepository.create({
        id: message.sender.id,
      });
      await this.userRepository.save(sender);
    }
    const messageRecord = this.messageRepository.create({
      tokens: encode(JSON.stringify(transformMessageToOpenAIFormat(message))).length,
      ...message,
      sender,
      parentId: this.parentId,
    });
    await this.messageRepository.save(messageRecord);
    this.history.push(RuntimeHistory.fromMessage(messageRecord));

    // remove older history to prevent exceeding token limit
    // NOTE: useless for now since `token-limiter` took place
    // if (this.history.length > this.HISTORY_COUNT_LIMIT) {
    //   this.history.shift();
    // }

    this.history = limitTokensFromMessages(this.history, modelMap[this.model].tokenLimit - 1000);
  }

  public get totalTokens() {
    return this.history.reduce((prev: number, history) => prev + history.tokens ?? 0, 0);
  }

  /**
   * Inner chat logic.
   * @param payload The message to send to the bot.
   * @param functionCallCnt Total recursions done to make function calls.
   * @private
   */
  private async *chatInner(payload: ChatInput | null, functionCallCnt: number = 0): ChatInner {
    // remind bot to update user information
    if (this.userTurns >= this.INFO_UPDATE_DELTA) {
      yield {
        type: 'update-info',
      };
      await this.createMessage({
        role: MessageRole.SYSTEM,
        content:
          "Please update user(s)'s personality traits, hobbies and other things according to your conversation. Do not reply to this message.",
      });
      this.userTurns = 0;
      this.isUpdatingUserInfo = true;
      return yield* this.chatInner(null);
    }

    if (payload !== null) {
      await this.createMessage({
        role: MessageRole.USER,
        content: payload.message,
        parentId: this.parentId,
        sender: {
          id: payload.senderId,
        },
      });
    }

    const reply: ChatCompletionChunk.Choice.Delta = {
      content: null,
      function_call: null,
      role: null,
    };

    let finishReason: ChatCompletion.Choice['finish_reason'] = null;

    const stream = await this.getNextMessage(this.getChatCompletionRequest());
    let isFirstContentPart = true;
    for await (const part of stream) {
      const { delta } = part;
      Object.entries(delta).forEach(([key, value]) => {
        if (reply[key] === null) {
          reply[key] =
            key === 'function_call'
              ? {
                  name: '',
                  arguments: '',
                }
              : '';
        }
        if (key !== 'function_call') {
          reply[key] += value ?? '';
        }
      });

      if (part.finish_reason) {
        finishReason = part.finish_reason;
        if (part.finish_reason !== 'function_call') {
          yield { type: 'message-end' };
        }
        break;
      }

      if (delta.function_call) {
        reply.function_call.name += delta.function_call.name ?? '';
        reply.function_call.arguments += delta.function_call.arguments ?? '';
      }

      if (delta.content) {
        if (isFirstContentPart) {
          yield {
            type: 'message-start',
          };
          isFirstContentPart = false;
        }
        yield {
          type: 'message-part',
          content: delta.content,
        };
      }
    }

    const replyContent = reply.content;
    await this.createMessage({
      role: MessageRole.ASSISTANT,
      content: replyContent,
      action: reply.function_call,
    });

    let isJSON = true;

    try {
      JSON.parse(replyContent);
    } catch {
      isJSON = false;
    }

    if (isJSON) {
      await this.createMessage({
        role: MessageRole.SYSTEM,
        content: 'Please stop replying in JSON format. Use plain text instead.',
      });
    }

    // function call handling
    if (finishReason === 'function_call') {
      const actionName = reply.function_call.name;
      const actionArgs = JSON.parse(reply.function_call.arguments);
      const action = actionMap[actionName];

      yield {
        type: this.isUpdatingUserInfo ? 'update-info-action' : 'action',
        actionArgs,
        actionName,
      };

      // IMPORTANT: `actionResponse` MUST NOT be falsy or OpenAI will throw a remote error
      let actionResponse =
        (await action.invoke(actionArgs, this.actionConfig, this.changeBotConfig.bind(this))) ??
        'success';
      if (functionCallCnt > this.MAX_CONTIGUOUS_FUNCTION_CALLS) {
        actionResponse = {
          status: 'error',
          message: 'Maximum contiguous function call limit reached. Please reply to the user.',
        };
      }
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

      return yield* this.chatInner(null, functionCallCnt + 1);
    }

    return undefined;
  }

  /**
   * Load the prompt from the file system.
   * @private
   */
  private loadPrompt() {
    const promptPath = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      `../prompts/${this.prompt}.md`,
    );
    if (!fs.existsSync(promptPath)) return;
    this.currentPrompt = fs.readFileSync(promptPath, { encoding: 'utf-8' });
  }

  /**
   * Builds chat history in OpenAI required format.
   * @private
   */
  private getChatCompletionRequest(): CreateChatCompletionRequestStreaming.Message[] {
    const systemPrompt = {
      role: MessageRole.SYSTEM,
      content: this.currentPrompt,
      id: 0,
    };

    const timePrompt = {
      role: MessageRole.SYSTEM,
      content: `It is now ${new Date().toString()}.`,
      id: 0,
    };

    const messages: ({
      id: number;
      tokens: number;
    } & CreateChatCompletionRequestStreaming.Message)[] = [
      {
        ...systemPrompt,
        tokens: getTokenCountFromMessage(systemPrompt),
      },
      { ...timePrompt, tokens: getTokenCountFromMessage(timePrompt) },
      ...this.history.map((history) => {
        return {
          role: history.role,
          content:
            // eslint-disable-next-line no-nested-ternary
            history.role === 'function'
              ? JSON.stringify(history.content)
              : history.role === 'user'
              ? JSON.stringify({
                  sender: {
                    id: history.sender?.id,
                    name: history.sender?.name,
                  },
                  content: history.content,
                })
              : history.content ?? '',
          function_call: history.action,
          name: history.actionName,
          id: history.id,
          tokens: history.tokens,
        };
      }),
    ];

    const getTotalTokens = () => {
      return messages.reduce((prev, curr) => prev + curr.tokens, 0);
    };

    while (getTotalTokens() >= modelMap[this.model].tokenLimit) {
      let longestMessageIdx = -1;
      let longestMessageLength = 0;
      messages.forEach((message, idx) => {
        const currentLength = message.tokens;
        if (currentLength > longestMessageLength) {
          longestMessageIdx = idx;
          longestMessageLength = currentLength;
        }
      });
      messages[
        longestMessageIdx
      ].content = `<message too long, use \`get_message(${messages[longestMessageIdx].id})\` to view>`;
      messages[longestMessageIdx].tokens = getTokenCountFromMessage(
        messages[longestMessageIdx] as Message,
      );
    }

    return messages;
  }

  /**
   * Get the next message from OpenAI.
   * @param messages Message history in OpenAI required format.
   * @private
   */
  private async *getNextMessage(
    messages: CreateChatCompletionRequestStreaming.Message[],
  ): AsyncGenerator<ChatCompletionChunk.Choice, any> {
    const stream = await this.openai.chat.completions.create({
      model: modelMap[this.model].name,
      messages,
      functions: actions,
      stream: true,
    });

    for await (const part of stream) {
      try {
        yield part.choices[0];
      } catch {
        // ignore
      }
    }
  }
}

export default ObserverX;
