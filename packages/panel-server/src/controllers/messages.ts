import { type Request, type Response } from 'express';
import { getMessages, Message } from '@observerx/core';
import { Controller, Get } from '@observerx/server-util';
import { getDataSource } from '@observerx/database';

@Controller('/messages')
class MessageController {
  private readonly MESSAGES_PER_PAGE: number = parseInt(process.env.MESSAGES_PER_PAGE ?? '20', 10);

  private readonly PARENTS_PER_PAGE: number = parseInt(process.env.PARENTS_PER_PAGE ?? '16', 10);

  @Get('/parents')
  public async getParents(req: Request, res: Response) {
    try {
      const page = parseInt((req.query.page as string) ?? '1', 10);
      const messageRepository = getDataSource().getRepository(Message);
      const { total, totalTokens }: { total: number; totalTokens: number } = await messageRepository
        .createQueryBuilder()
        .select('COUNT(DISTINCT("parentId"))', 'total')
        .addSelect('CAST(SUM("tokens") as INTEGER)', 'totalTokens')
        .getRawOne();
      const parents = await messageRepository
        .createQueryBuilder('message')
        .select(
          'message.parentId, CAST(COUNT(*) as INTEGER) as messages, CAST(SUM(message.tokens) as INTEGER) as tokens',
        )
        .groupBy('message.parentId')
        .orderBy('messages', 'DESC')
        .skip((page - 1) * this.PARENTS_PER_PAGE)
        .take(this.PARENTS_PER_PAGE)
        .getRawMany();
      res.json({
        parents,
        totalTokens,
        total,
        totalPages: Math.ceil(total / this.PARENTS_PER_PAGE),
        perPage: this.PARENTS_PER_PAGE,
        status: 'success',
      });
    } catch (e) {
      res.json({
        status: 'error',
        message: e.toString(),
      });
    }
  }

  @Get('/:parentId')
  public async getMessages(req: Request, res: Response) {
    try {
      const page = parseInt((req.query.page as string) ?? '1', 10);
      const { parentId } = req.params;
      const [messages, total] = await getMessages({
        take: this.MESSAGES_PER_PAGE,
        skip: (page - 1) * this.MESSAGES_PER_PAGE,
        order: {
          timestamp: 'DESC',
        },
        where: {
          parentId,
        },
        relations: ['sender'],
      });
      res.json({
        messages,
        total,
        totalPages: Math.ceil(total / this.MESSAGES_PER_PAGE),
        perPage: this.MESSAGES_PER_PAGE,
      });
    } catch (e) {
      res.json({
        status: 'error',
        message: e.toString(),
      });
    }
  }

  @Get('/:parentId/latest')
  public async getLatestMessage(req: Request, res: Response) {
    try {
      const { parentId } = req.params;
      if (!req.query.lastMessageId) {
        res.json({
          status: 'error',
          message: 'Missing lastMessageId',
        });
        return;
      }
      const lastMessageId = parseInt(req.query.lastMessageId as string, 10);
      const messageRepository = getDataSource().getRepository(Message);
      const lastMessage = await messageRepository.findOneBy({ id: lastMessageId, parentId });
      if (!lastMessage) {
        res.json({
          status: 'error',
          message: 'Message not found',
        });
        return;
      }
      const messages = await messageRepository
        .createQueryBuilder('message')
        .where('message.timestamp > :timestamp', { timestamp: lastMessage.timestamp })
        .andWhere({ parentId })
        .leftJoinAndSelect('message.sender', 'sender')
        .orderBy('message.timestamp', 'DESC')
        .getMany();
      res.json({
        messages: messages.slice(0, messages.length - 1),
        status: 'success',
      });
    } catch (e) {
      res.json({
        status: 'error',
        message: e.toString(),
      });
    }
  }
}

export default MessageController;
