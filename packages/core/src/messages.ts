import dataSource from './data-source.js';
import Message from './entity/Message.js';

const messageRepository = dataSource.getRepository(Message);

async function getMessages(take: number, skip: number, order: 'DESC' | 'ASC' = 'DESC') {
  return messageRepository.findAndCount({
    take,
    skip,
    order: { timestamp: order },
  });
}

export default getMessages;
