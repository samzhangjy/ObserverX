import 'dotenv/config';
import axios from 'axios';
import ObserverX from '@observerx/core';
import process from 'process';
import chalk from 'chalk';
import startReverseServer, { type IMessageHandler } from './server.js';

const host = process.env.CQ_SERVER_HOST ?? '127.0.0.1';
const port = parseInt(process.env.CQ_SERVER_PORT, 10) || 8080;
const server = `http://${host}:${port}`;

const botMap: Map<string, ObserverX> = new Map();
const lastReplyTime: Map<string, number> = new Map();

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

async function handleMessage({ isPrivate, senderId, message, groupId }: IMessageHandler) {
  console.log(`Received message from ${chalk.green(senderId)}: ${chalk.blue(message)}`);
  const parentId = isPrivate ? `DM_${senderId}` : `GROUP_${groupId}`;
  if (!botMap.has(parentId)) {
    botMap.set(parentId, new ObserverX(isPrivate ? 'private' : 'group', 'GPT-3.5', parentId));
    lastReplyTime.set(parentId, Date.now() - 10000);
  }
  const bot = botMap.get(parentId);

  if (!isPrivate && Date.now() - lastReplyTime.get(parentId) < 3000) {
    console.log('Too frequent, skip.');
    await bot.addMessageToQueue({
      message,
      senderId,
    });
    return;
  }
  lastReplyTime.set(parentId, Date.now());

  const stream = await bot.chat({
    message,
    senderId,
  });

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
    }
  }

  await sendMessage({
    isPrivate,
    to: isPrivate ? senderId : groupId,
    message: reply,
  });

  lastReplyTime.set(parentId, Date.now());
}

startReverseServer(handleMessage);
