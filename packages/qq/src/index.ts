import 'dotenv/config';
import ObserverX, { addActions } from '@observerx/core';
import process from 'process';
import chalk from 'chalk';
import { addEntities, getDataSource } from '@observerx/database';
import startReverseServer, { type IMessageHandler } from './server.js';
import Contact, { ContactType } from './entity/Contact.js';
import { getContactInfoAction, refreshContactInfoAction } from './actions/contact-info.js';
import { getGroupName, sendMessage } from './gocq.js';

const botMap: Map<string, ObserverX> = new Map();
const hasNewMessages: Map<string, boolean> = new Map();

addEntities(...ObserverX.getDatabaseEntities(), Contact);

const dataSource = getDataSource();

await dataSource.initialize();

addActions(getContactInfoAction, refreshContactInfoAction);

export interface ISendMessage {
  isPrivate: boolean;
  to: string;
  message: string;
}

async function getResponse(parentId: string, isPrivate: boolean, sendTo: string) {
  if (!hasNewMessages.get(parentId)) return;

  hasNewMessages.set(parentId, false);
  const bot = botMap.get(parentId);
  const stream = await bot.chat(null);

  let reply = '';

  for await (const segment of stream) {
    if (typeof segment === 'string') {
      console.log(chalk.bold.red(segment));
      reply = segment;
      break;
    } else if (segment.type === 'message-start') {
      process.stdout.write(chalk.bold.blue('Replying with: '));
    } else if (segment.type === 'message-part') {
      process.stdout.write(segment.content);
      reply += segment.content;
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

  await sendMessage({
    isPrivate,
    to: sendTo,
    message: reply,
  });
}

async function handleMessage({
  isPrivate,
  senderId,
  message,
  groupId,
  senderNickname,
}: IMessageHandler) {
  console.log(
    `Received message from ${chalk.green(senderId)}${
      !isPrivate ? ` in group ${chalk.yellow(groupId)}` : ''
    }: ${chalk.blue(message)}`,
  );
  const parentId = isPrivate ? `DM_${senderId}` : `GROUP_${groupId}`;
  const contactRepository = dataSource.getRepository(Contact);

  if (!(await contactRepository.findOneBy({ parentId }))) {
    const currentContact = await contactRepository.create({
      parentId,
      type: isPrivate ? ContactType.SINGLE_USER_DIRECT_MESSAGE : ContactType.GROUP_MESSAGE,
      name: isPrivate ? senderNickname : await getGroupName(groupId),
    });
    await contactRepository.save(currentContact);
  }

  if (!botMap.has(parentId)) {
    botMap.set(
      parentId,
      new ObserverX({
        prompt: isPrivate ? 'private' : 'group',
        model: 'GPT-3.5',
        parentId,
        dataSource,
      }),
    );
    setInterval(() => {
      console.log(chalk.gray('Checking for new messages...'));
      getResponse(parentId, isPrivate, isPrivate ? senderId : groupId);
    }, 10000);
  }
  const bot = botMap.get(parentId);

  await bot.addMessageToQueue({
    message,
    senderId,
  });
  console.log(`Added message to queue. Total tokens: ${chalk.blue(bot.totalTokens)}`);
  hasNewMessages.set(parentId, true);
}

startReverseServer(handleMessage);
