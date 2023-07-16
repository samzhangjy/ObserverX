/* eslint-disable */
import dataSource from '../data-source.js';
import Message from '../entity/Message.js';

export interface SearchChatHistoryParameters {
  keyword?: string;
}

async function searchChatHistory({ keyword }: SearchChatHistoryParameters) {
  const messageRepository = dataSource.getRepository(Message);
}
