import 'dotenv/config';
import axios from 'axios';
import ObserverX from '@observerx/core';
import process from 'process';
import chalk from 'chalk';
import { addEntities, getDataSource } from '@observerx/database';
import startReverseServer, { type IMessageHandler } from './server.js';
import Contact from './entity/Contact';

const host = process.env.CQ_SERVER_HOST ?? '127.0.0.1';
const port = parseInt(process.env.CQ_SERVER_PORT, 10) || 8080;
const server = `http://${host}:${port}`;

const botMap: Map<string, ObserverX> = new Map();
const hasNewMessages: Map<string, boolean> = new Map();

addEntities(...ObserverX.getDatabaseEntities(), Contact);

const dataSource = getDataSource();

await dataSource.initialize();

export interface ISendMessage {
  isPrivate: boolean;
  to: string;
  message: string;
}

async function sendMessage({ isPrivate, to, message }: ISendMessage) {
  if (isPrivate) {
    await axios.post(`${server}/send_private_msg`, {
      user_id: to,
      message,
    });
  } else {
    await axios.post(`${server}/send_group_msg`, {
      group_id: to,
      message,
    });
  }
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

async function handleMessage({ isPrivate, senderId, message, groupId }: IMessageHandler) {
  console.log(`Received message from ${chalk.green(senderId)}: ${chalk.blue(message)}`);
  const parentId = isPrivate ? `DM_${senderId}` : `GROUP_${groupId}`;
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
    setInterval(() => getResponse(parentId, isPrivate, isPrivate ? senderId : groupId), 10000);
  }
  const bot = botMap.get(parentId);

  await bot.addMessageToQueue({
    message,
    senderId,
  });
  hasNewMessages.set(parentId, true);
}

startReverseServer(handleMessage);
