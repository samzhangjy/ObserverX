import { getDataSource } from '@observerx/database';
import { FindManyOptions } from 'typeorm';
import Message from './entities/Message.js';

async function getMessages(options: FindManyOptions<Message>) {
  const messageRepository = getDataSource().getRepository(Message);
  return messageRepository.findAndCount(options);
}

export default getMessages;
