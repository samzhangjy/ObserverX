import { encode } from 'gpt-tokenizer';
import Message from '../entity/Message.js';
import { transformMessageToOpenAIFormat } from './transform.js';

export interface BaseMessage {
  id: number;
  tokens?: number;
  content?: string;
}

export function getTokenCountFromMessage(message: Partial<Message>) {
  return encode(JSON.stringify(transformMessageToOpenAIFormat(message))).length;
}

export function getTokenCountFromMessages<T extends BaseMessage>(messages: T[]) {
  let result = 0;
  for (const message of messages) {
    result += message.tokens ?? 0;
  }
  return result;
}

export function limitTokensFromMessages<T extends BaseMessage>(messages: T[], limit: number): T[] {
  const result = messages;
  const modifiedMessages = [];

  while (getTokenCountFromMessages(result) >= limit) {
    if (modifiedMessages.length >= messages.length) break;
    const longestMessage = result.reduce((prev, curr) => (prev.tokens > curr.tokens ? prev : curr));
    if (longestMessage.tokens <= 200) break;
    const longestMessageId = result.findIndex((message) => message.id === longestMessage.id);
    result[
      longestMessageId
    ].content = `<message too long, use \`get_message({ id: ${longestMessage.id} })\` to view>`;
    // IMPORTANT: update token count afterwards or else it will cause an infinite loop
    result[longestMessageId].tokens = getTokenCountFromMessage(result[longestMessageId]);
    modifiedMessages.push(longestMessageId);
  }

  // in case of everything got modified and still exceeds the limit, remove the oldest messages
  while (getTokenCountFromMessages(result) >= limit) {
    result.shift();
  }

  return result;
}
