import 'dotenv/config'; // eslint-disable-line
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import OpenAI from 'openai';
import { DataSource, DeepPartial, Repository } from 'typeorm';
import { Chat, CreateChatCompletionRequestMessage } from 'openai/resources/chat'; // eslint-disable-line
import { APIError } from 'openai/error'; // eslint-disable-line
import { encode } from 'gpt-tokenizer';
import { type Entity } from '@observerx/database';
import { Stream } from 'openai/streaming'; // eslint-disable-line
import RuntimeHistory from './runtime-history.js';
import { Action } from './actions/index.js';
import Message, { MessageRole } from './entities/Message.js';
import { BotModel, modelMap } from './config.js';
import { getTokenCountFromMessage, limitTokensFromMessages } from './common/token-limiter.js';
import { transformMessageToOpenAIFormat } from './common/transform.js';
import User from './entities/User.js';
import { Plugin, PluginManager } from './plugins/index.js';
import ChatCompletionChunk = Chat.ChatCompletionChunk;
import ChatCompletion = Chat.ChatCompletion;
import { Middleware, MiddlewareCause } from './middlewares/index.js';

// eslint-disable-next-line @typescript-eslint/naming-convention,no-underscore-dangle
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const builtinPrompts = ['default', 'qq-group', 'qq-private'] as const;

export type BotPrompt = (typeof builtinPrompts)[number] | (string & {});

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
    | 'error'
    | (string & {});

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

  /**
   * Possible error thrown by OpenAI API.
   */
  error?: APIError;
}

type ChatInner = AsyncGenerator<ChatResult, void | null | ChatInner>;

export type IChat = ChatInner;

export interface ChatInput {
  senderId: string;
  message: string;
}

export interface IObserverX {
  prompt?: BotPrompt;
  model?: BotModel;
  parentId?: string;
  actions?: Action[];
  middlewares?: (typeof Middleware)[];
  plugins?: (typeof Plugin)[];
  dataSource: DataSource;
}

/**
 * ObserverX core.
 */
class ObserverX {
  public model: BotModel = 'GPT-3.5';

  public parentId: string = 'UNKNOWN';

  public prompt: BotPrompt = 'default';

  public readonly dataSource: DataSource;

  private history: RuntimeHistory[] = [];

  private readonly openai: OpenAI;

  private userTurns: number = 0;

  private isUpdatingUserInfo: boolean = false;

  private readonly messageRepository: Repository<Message>;

  private readonly userRepository: Repository<User>;

  private readonly HISTORY_COUNT_LIMIT: number = parseInt(
    process.env.HISTORY_COUNT_LIMIT ?? '80',
    10,
  );

  private readonly MAX_CONTIGUOUS_FUNCTION_CALLS = 8;

  private readonly pluginManager: PluginManager = new PluginManager();

  /**
   * Create a new bot.
   * @param prompt Bot prompt to use.
   * @param model Bot model to use.
   * @param parentId Conversation parent ID.
   * @param actions Actions allowed for bot to use.
   * @param middlewares Bot middlewares.
   * @param plugins Bot plugins.
   * @param dataSource TypeORM database source to use.
   */
  constructor({
    prompt = 'default',
    model = 'GPT-3.5',
    parentId = 'UNKNOWN',
    actions = [],
    middlewares = [],
    plugins = [],
    dataSource,
  }: IObserverX) {
    this.dataSource = dataSource;
    this.prompt = prompt;
    this.model = model;
    this.parentId = parentId;

    this.pluginManager.addPlugins(...plugins);
    this.pluginManager.actionManager.addActions(...actions);
    this.pluginManager.middlewareManager.addMiddlewares(...middlewares);

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

  public get totalTokens() {
    return this.history.reduce((prev: number, history) => prev + history.tokens ?? 0, 0);
  }

  public static getDatabaseEntities(): Entity[] {
    return [path.join(__dirname, './entities/*.{js,ts}')];
  }

  /**
   * Chat with the bot.
   * @param payload The message to send to the bot.
   */
  public async chat(payload: ChatInput | null): Promise<IChat> {
    this.userTurns += 1;
    return this.chatInner(payload);
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

  /**
   * Create a message record in the database and add it to local history.
   *
   * NOTE: this function should ONLY be used by middlewares / actions.
   *       For end-users, use `addMessageToQueue` instead.
   * @param message Message object to create.
   */
  public async createMessage(message: DeepPartial<Omit<Message, 'tokens'>>) {
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

    this.history = limitTokensFromMessages(this.history, modelMap[this.model].tokenLimit - 1000);
  }

  /**
   * Inner chat logic.
   * @param payload The message to send to the bot.
   * @param functionCallCnt Total recursions done to make function calls.
   * @private
   */
  private async *chatInner(payload: ChatInput | null, functionCallCnt: number = 0): ChatInner {
    let shouldReply = true;
    const invokeCause: MiddlewareCause = functionCallCnt ? 'function' : 'message';

    for (const middleware of this.pluginManager.middlewareManager.middlewares) {
      // eslint-disable-next-line no-await-in-loop
      const result = await middleware.preProcess(payload, invokeCause, this);
      if (!result) continue;
      if (result.result) {
        yield result.result;
      }
      if (result.stopCurrentReply) {
        shouldReply = false;
      }
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
    let error: APIError | null = null;

    for await (const part of stream) {
      if (part.status !== 'success') {
        error = part.error;
        break;
      }
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
        if (part.finish_reason !== 'function_call' && shouldReply) {
          yield { type: 'message-end' };
        }
        break;
      }

      if (delta.function_call) {
        reply.function_call.name += delta.function_call.name ?? '';
        reply.function_call.arguments += delta.function_call.arguments ?? '';
      }

      if (delta.content && shouldReply) {
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

    if (error) {
      yield {
        type: 'error',
        error,
      };
      return;
    }

    if (shouldReply) {
      const replyContent = reply.content;
      await this.createMessage({
        role: MessageRole.ASSISTANT,
        content: replyContent,
        action: reply.function_call,
      });
    }

    // function call handling
    if (finishReason === 'function_call') {
      const actionName = reply.function_call.name;
      const actionArgs = JSON.parse(reply.function_call.arguments);
      const action = this.pluginManager.actionMap[actionName];

      yield {
        type: 'action',
        actionArgs,
        actionName,
      };

      for (const middleware of this.pluginManager.middlewares) {
        // IMPORTANT: keep the middleware execution order AS-IS
        // eslint-disable-next-line no-await-in-loop
        const result = await middleware.preFunctionCall(
          {
            name: actionName,
            args: actionArgs,
          },
          this,
        );
        if (result && result.result) {
          yield result.result;
        }
      }

      // IMPORTANT: `actionResponse` MUST NOT be falsy or OpenAI will throw a remote error
      let actionResponse = (await action.invoke(actionArgs, this)) ?? 'success';
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
        type: 'action-result',
        result: actionResponse,
      };

      for (const middleware of this.pluginManager.middlewares) {
        // eslint-disable-next-line no-await-in-loop
        const result = await middleware.postFunctionCall(
          {
            name: actionName,
            args: actionArgs,
            response: actionResponse,
          },
          this,
        );
        if (result && result.result) {
          yield result.result;
        }
      }

      if (this.isUpdatingUserInfo) {
        this.isUpdatingUserInfo = false;
      }

      yield* this.chatInner(null, functionCallCnt + 1);
      return;
    }

    for (const middleware of this.pluginManager.middlewares) {
      // eslint-disable-next-line no-await-in-loop
      const result = await middleware.postProcess(payload, invokeCause, this);
      if (result && result.result) {
        yield result.result;
      }
    }
  }

  /**
   * Load the prompt from the file system.
   * @private
   */
  private loadPrompt() {
    if (!builtinPrompts.includes(this.prompt as any)) return;
    const promptPath = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      `../prompts/${this.prompt}.md`,
    );
    if (!fs.existsSync(promptPath)) return;
    this.prompt = fs.readFileSync(promptPath, { encoding: 'utf-8' });
  }

  /**
   * Builds chat history in OpenAI required format.
   * @private
   */
  private getChatCompletionRequest(): CreateChatCompletionRequestMessage[] {
    const systemPrompt = {
      role: MessageRole.SYSTEM,
      content: this.prompt,
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
    } & CreateChatCompletionRequestMessage)[] = [
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
    messages: CreateChatCompletionRequestMessage[],
  ): AsyncGenerator<
    (ChatCompletionChunk.Choice & { status: 'success' }) | { status: 'error'; error: APIError },
    any
  > {
    let stream: Stream<OpenAI.Chat.Completions.ChatCompletionChunk>;
    try {
      stream = await new Promise<Stream<OpenAI.Chat.Completions.ChatCompletionChunk>>(
        (resolve, reject) => {
          this.openai.chat.completions
            .create({
              model: modelMap[this.model].name,
              messages,
              functions:
                this.pluginManager.actionDocs.length > 0
                  ? this.pluginManager.actionDocs
                  : undefined,
              stream: true,
            })
            .then((res) => resolve(res))
            .catch((err) => reject(err));
        },
      );
    } catch (e) {
      yield {
        status: 'error',
        error: e,
      };
      return;
    }

    for await (const part of stream) {
      try {
        yield { ...part.choices[0], status: 'success' };
      } catch (e) {
        yield {
          status: 'error',
          error: e,
        };
        return;
      }
    }
  }
}

export default ObserverX;
