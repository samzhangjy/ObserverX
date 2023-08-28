import { type Request, type Response } from 'express';
import { getMessages, Message } from '@observerx/core';
import { Controller, Get } from '@observerx/server-util';
import { getDataSource } from '@observerx/database';

@Controller('/messages')
class MessageController {
  private readonly MESSAGES_PER_PAGE: number = parseInt(process.env.MESSAGES_PER_PAGE ?? '20', 10);

  private readonly PARENTS_PER_PAGE: number = parseInt(process.env.PARENTS_PER_PAGE ?? '16', 10);

  @Get()
  public async getMessages(req: Request, res: Response) {
    try {
      const page = parseInt((req.query.page as string) ?? '1', 10);
      const parentId = req.query.parentId as string;
      if (!parentId) {
        res.json({
          status: 'error',
          message: 'parentId is required.',
        });
        return;
      }
      const [messages, total] = await getMessages({
        take: this.MESSAGES_PER_PAGE,
        skip: (page - 1) * this.MESSAGES_PER_PAGE,
        order: {
          timestamp: 'DESC',
        },
        where: {
          parentId,
        },
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

  @Get('/parents')
  public async getParents(req: Request, res: Response) {
    try {
      const page = parseInt((req.query.page as string) ?? '1', 10);
      const messageRepository = getDataSource().getRepository(Message);
      const { total }: { total: number } = await messageRepository
        .createQueryBuilder()
        .select('COUNT(DISTINCT("parentId"))', 'total')
        .getRawOne();
      const parents = await messageRepository
        .createQueryBuilder('message')
        .select(
          'message.parentId, CAST(COUNT(*) as INTEGER) as count, SUM(message.tokens) as totalTokens',
        )
        .groupBy('message.parentId')
        .orderBy('count', 'DESC')
        .skip((page - 1) * this.PARENTS_PER_PAGE)
        .take(this.PARENTS_PER_PAGE)
        .getRawMany();
      res.json({
        parents,
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
}

export default MessageController;
