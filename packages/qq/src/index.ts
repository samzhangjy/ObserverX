import 'dotenv/config';
import ObserverX, { addActions, type BotModel, ChatResult, Platform } from '@observerx/core';
import process from 'process';
import chalk from 'chalk';
import { DataSource, Repository } from 'typeorm';
import { Entity } from '@observerx/database';
import { type IMessageHandler, startReverseServer, stopReverseServer } from './server.js';
import Contact, { ContactType } from './entity/Contact.js';
import { getContactInfoAction, refreshContactInfoAction } from './actions/contact-info.js';
import { getGroupName, sendMessage } from './gocq.js';

export interface ISendMessage {
  isPrivate: boolean;
  to: string;
  message: string;
}

class PlatformQQ implements Platform {
  public readonly platformActions = [
    'get_model',
    'set_model',
    'get_contacts',
    'set_contact_enabled',
    'set_contact_prompt',
    'set_contact_reply_interval',
    'get_contact',
  ] as const;

  private readonly botMap: Map<string, ObserverX> = new Map();

  private readonly hasNewMessages: Map<string, boolean> = new Map();

  private readonly contactRepository: Repository<Contact>;

  private readonly dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
    if (!this.dataSource.isInitialized) {
      throw new Error('Data source not initialized.');
    }

    this.contactRepository = dataSource.getRepository(Contact);

    addActions(getContactInfoAction, refreshContactInfoAction);

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
        }),
      );
      setInterval(() => {
        console.log(chalk.gray('Checking for new messages...'));
        this.getResponse(parentId, isPrivate, isPrivate ? senderId : groupId);
      }, currentContact.replyInterval);
    }
    const bot = this.botMap.get(parentId);

    await bot.addMessageToQueue({
      message,
      senderId,
    });
    console.log(`Added message to queue. Total tokens: ${chalk.blue(bot.totalTokens)}`);
    this.hasNewMessages.set(parentId, true);
  }

  public invokePlatformAction(actionName: (typeof this.platformActions)[number], ...args): any {
    switch (actionName) {
      case 'get_model':
        return this.getBotModel(...(args as Parameters<typeof this.getBotModel>));
      case 'set_model':
        return this.setBotModel(...(args as Parameters<typeof this.setBotModel>));
      case 'get_contacts':
        return this.getContacts();
      case 'set_contact_enabled':
        return this.setContactEnabled(...(args as Parameters<typeof this.setContactEnabled>));
      case 'set_contact_prompt':
        return this.setContactPrompt(...(args as Parameters<typeof this.setContactPrompt>));
      case 'set_contact_reply_interval':
        return this.setContactReplyInterval(
          ...(args as Parameters<typeof this.setContactReplyInterval>),
        );
      case 'get_contact':
        return this.getContact(...(args as Parameters<typeof this.getContact>));
      default:
        return null;
    }
  }

  private logSegment(segment: string | ChatResult) {
    if (typeof segment === 'string') {
      console.log(chalk.bold.red(segment));
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

  private async getBotModel(parentId: string) {
    const currentContact = await this.contactRepository.findOneBy({ parentId });
    return currentContact.model;
  }

  private async setBotModel(parentId: string, model: BotModel) {
    if (!['GPT-3.5', 'GPT-4'].includes(model)) {
      throw new Error('Invalid model.');
    }
    const currentContact = await this.contactRepository.findOneBy({ parentId });
    currentContact.model = model;
    if (this.botMap.has(parentId)) {
      const bot = this.botMap.get(parentId);
      bot.changeBotConfig({
        ...bot.getBotConfig(),
        model,
      });
    }
    await this.contactRepository.save(currentContact);
  }

  private async getContacts() {
    return this.contactRepository.find();
  }

  private async getContact(parentId: string) {
    return this.contactRepository.findOneBy({ parentId });
  }

  private async setContactEnabled(parentId: string, enabled: boolean) {
    const currentContact = await this.contactRepository.findOneBy({ parentId });
    currentContact.enabled = enabled;
    await this.contactRepository.save(currentContact);
  }

  private async setContactPrompt(parentId: string, prompt: string) {
    const currentContact = await this.contactRepository.findOneBy({ parentId });
    currentContact.prompt = prompt;
    await this.contactRepository.save(currentContact);
  }

  private async setContactReplyInterval(parentId: string, replyInterval: number) {
    const currentContact = await this.contactRepository.findOneBy({ parentId });
    currentContact.replyInterval = replyInterval;
    await this.contactRepository.save(currentContact);
  }
}

export default PlatformQQ;
