import { type Request, type Response } from 'express';
import { getMessages } from '@observerx/core';
import { Controller, Get } from '@observerx/server-util';

@Controller('/messages')
export default class MessageController {
  private readonly MESSAGES_PER_PAGE: number = parseInt(process.env.MESSAGES_PER_PAGE ?? '20', 10);

  @Get()
  public async getMessages(req: Request, res: Response) {
    try {
      const page = parseInt((req.query.page as string) ?? '1', 10);
      const [messages, total] = await getMessages({
        take: this.MESSAGES_PER_PAGE,
        skip: (page - 1) * this.MESSAGES_PER_PAGE,
        order: {
          timestamp: 'DESC',
        },
      });
      return res.json({
        messages: messages.reverse(),
        total,
        total_pages: Math.ceil(total / this.MESSAGES_PER_PAGE),
        current_page: page,
      });
    } catch (e) {
      return res.json({
        status: 'error',
        message: e.toString(),
      });
    }
  }
}
