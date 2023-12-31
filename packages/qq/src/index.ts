import 'dotenv/config'; // eslint-disable-line
import process from 'process';
import ObserverX, {
  type BotModel,
  ChatResult,
  Platform,
  Plugin,
  Action,
  Middleware,
  getUser,
  createUser,
  updateUser,
} from '@observerx/core';
import chalk from 'chalk';
import { DataSource, Repository } from 'typeorm';
import { Entity } from '@observerx/database';
import { type IMessageHandler, startReverseServer, stopReverseServer } from './server.js';
import Contact, { ContactType } from './entity/Contact.js';
// eslint-disable-next-line import/no-cycle
import { getContactInfoAction, refreshContactInfoAction } from './actions/contact-info.js';
import { getBotId, getGroupName, sendMessage } from './gocq.js';

export interface ISendMessage {
  isPrivate: boolean;
  to: string;
  message: string;
}

export interface IPlatformQQConfig {
  plugins?: (typeof Plugin)[];
  actions?: Action[];
  middlewares?: (typeof Middleware)[];
}

class PlatformQQ implements Platform {
  private readonly botMap: Map<string, ObserverX> = new Map();

  private readonly hasNewMessages: Map<string, boolean> = new Map();

  private readonly contactRepository: Repository<Contact>;

  private readonly dataSource: DataSource;

  private readonly plugins: (typeof Plugin)[];

  private readonly actions: Action[];

  private readonly middlewares: (typeof Middleware)[];

  private botId: string;

  constructor(
    dataSource: DataSource,
    { plugins = [], actions = [], middlewares = [] }: IPlatformQQConfig = {},
  ) {
    this.dataSource = dataSource;
    if (!this.dataSource.isInitialized) {
      throw new Error('Data source not initialized.');
    }

    this.contactRepository = dataSource.getRepository(Contact);

    this.plugins = plugins;
    this.actions = actions;
    this.middlewares = middlewares;

    getBotId().then((botId) => {
      this.botId = botId;
    });

    this.initialize();
  }

  public initialize() {
    this.botMap.clear();
    this.hasNewMessages.clear();
  }

  public static getDatabaseEntities(): Entity[] {
    return [Contact];
  }

  public start() {
    startReverseServer(this.handleMessage.bind(this));
  }

  public stop() {
    stopReverseServer();
  }

  async getResponse(parentId: string, isPrivate: boolean, sendTo: string) {
    if (!this.hasNewMessages.get(parentId)) return;

    this.hasNewMessages.set(parentId, false);
    const bot = this.botMap.get(parentId);
    const stream = await bot.chat(null);

    let reply = '';

    for await (const segment of stream) {
      this.logSegment(segment);
      if (typeof segment === 'string') {
        reply = segment;
        break;
      } else if (segment.type === 'message-part') {
        reply += segment.content;
      }
    }
    const currentContact = await this.contactRepository.findOneBy({ parentId });
    currentContact.model = bot.model;
    await this.contactRepository.save(currentContact);

    await sendMessage({
      isPrivate,
      to: sendTo,
      message: reply,
    });
  }

  async handleMessage({ isPrivate, senderId, message, groupId, senderNickname }: IMessageHandler) {
    console.log(
      `Received message from ${chalk.green(senderId)}${
        !isPrivate ? ` in group ${chalk.yellow(groupId)}` : ''
      }: ${chalk.blue(message)}`,
    );
    const parentId = isPrivate ? `DM_${senderId}` : `GROUP_${groupId}`;

    let currentContact = await this.contactRepository.findOneBy({ parentId });
    if (!currentContact) {
      currentContact = await this.contactRepository.create({
        parentId,
        type: isPrivate ? ContactType.SINGLE_USER_DIRECT_MESSAGE : ContactType.GROUP_MESSAGE,
        name: isPrivate ? senderNickname : await getGroupName(groupId),
        model: 'GPT-3.5',
      });
      await this.contactRepository.save(currentContact);
    }

    if (!currentContact.enabled) return;

    let sender = await getUser(senderId);
    if (!sender) {
      sender = await createUser({
        id: senderId,
        name: senderNickname,
      });
    }

    if (!sender.name) {
      await updateUser({
        id: senderId,
        name: senderNickname,
      });
    }

    if (!this.botMap.has(parentId)) {
      this.botMap.set(
        parentId,
        new ObserverX({
          prompt: !currentContact.prompt
            ? isPrivate
              ? 'qq-private'
              : 'qq-group'
            : currentContact.prompt,
          model: (currentContact.model as BotModel) ?? 'GPT-3.5',
          parentId,
          dataSource: this.dataSource,
          actions: [...this.actions, getContactInfoAction, refreshContactInfoAction],
          plugins: this.plugins,
          middlewares: this.middlewares,
        }),
      );
      setInterval(() => {
        console.log(
          chalk.gray('Checking new messages for ') + chalk.blue(parentId) + chalk.gray('...'),
        );
        this.getResponse(parentId, isPrivate, isPrivate ? senderId : groupId);
      }, currentContact.replyInterval);
    }
    const bot = this.botMap.get(parentId);

    // replace at-calls to the bot to minimize mis-understandings
    const processedMessage = message.replace(`[CQ:at,qq=${this.botId}]`, '@ObserverX');

    await bot.addMessageToQueue({
      message: processedMessage,
      senderId,
    });
    console.log(`Added message to queue. Total tokens: ${chalk.blue(bot.totalTokens)}`);
    this.hasNewMessages.set(parentId, true);
  }

  private logSegment(segment: ChatResult) {
    if (segment.type === 'error') {
      process.stdout.write(
        `${chalk.gray('An unexpected error occurred:')}\n${chalk.bold.red(
          segment.error.name,
        )} (status=${chalk.blue(segment.error.status)}): ${chalk.bold(
          segment.error.message,
        )}\n${chalk.gray(JSON.stringify(segment.error.error, undefined, 2))}`,
      );
    } else if (segment.type === 'message-start') {
      process.stdout.write(chalk.bold.blue('Replying with: '));
    } else if (segment.type === 'message-part') {
      process.stdout.write(segment.content);
    } else if (segment.type === 'message-end') {
      process.stdout.write('\n');
    } else if (segment.type === 'action') {
      process.stdout.write(
        `${chalk.gray('Using tool: ')}${chalk.italic(segment.actionName)}(${Object.entries(
          segment.actionArgs,
        )
          .map(([key, value]) => `${key}=${chalk.green(value.toString())}`)
          .join(', ')})${chalk.gray('... ')}`,
      );
    } else if (segment.type === 'action-result') {
      process.stdout.write(chalk.gray('done.\n'));
      process.stdout.write(`${chalk.gray('Action result: ')}${JSON.stringify(segment.result)}\n`);
    }
  }

  public async getBotModel(parentId: string) {
    const currentContact = await this.contactRepository.findOneBy({ parentId });
    return currentContact.model;
  }

  public async setBotModel(parentId: string, model: BotModel) {
    if (!['GPT-3.5', 'GPT-4'].includes(model)) {
      throw new Error('Invalid model.');
    }
    const currentContact = await this.contactRepository.findOneBy({ parentId });
    currentContact.model = model;
    if (this.botMap.has(parentId)) {
      const bot = this.botMap.get(parentId);
      bot.model = model;
    }
    await this.contactRepository.save(currentContact);
  }

  public async getContacts() {
    return this.contactRepository.find();
  }

  public async getContact(parentId: string) {
    return this.contactRepository.findOneBy({ parentId });
  }

  public async setContactEnabled(parentId: string, enabled: boolean) {
    const currentContact = await this.contactRepository.findOneBy({ parentId });
    currentContact.enabled = enabled;
    await this.contactRepository.save(currentContact);
  }

  public async setContactPrompt(parentId: string, prompt: string) {
    const currentContact = await this.contactRepository.findOneBy({ parentId });
    currentContact.prompt = prompt;
    await this.contactRepository.save(currentContact);
    if (this.botMap.has(parentId)) {
      this.botMap.get(parentId).prompt = prompt;
    }
  }

  public async setContactReplyInterval(parentId: string, replyInterval: number) {
    const currentContact = await this.contactRepository.findOneBy({ parentId });
    currentContact.replyInterval = replyInterval;
    await this.contactRepository.save(currentContact);
  }
}

export default PlatformQQ;
