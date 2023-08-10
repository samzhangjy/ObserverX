import { DataSource } from 'typeorm';
import Message from './entity/Message.js';

async function getMessages(
  dataSource: DataSource,
  take: number,
  skip: number,
  order: 'DESC' | 'ASC' = 'DESC',
) {
  const messageRepository = dataSource.getRepository(Message);
  return messageRepository.findAndCount({
    take,
    skip,
    order: { timestamp: order },
  });
}

export default getMessages;
