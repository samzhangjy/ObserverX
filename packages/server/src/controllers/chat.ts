import 'reflect-metadata';
import { type Request, type Response } from 'express';
import ObserverX, { ChatResult } from '@observerx/core';
import { Controller, Get, Post } from '@observerx/server-util';
import { getDataSource } from '@observerx/database';

@Controller('/chat')
export default class ChatController {
  private readonly bot: ObserverX;

  private stream: AsyncGenerator<ChatResult> | string;

  private isStreaming: boolean = false;

  constructor() {
    this.bot = new ObserverX({ dataSource: getDataSource(), parentId: 'HTTP_SERVER' });
  }

  @Get()
  public welcome(req: Request, res: Response): void {
    res.json({ message: 'Welcome to ObserverX API server!' });
  }

  @Post()
  public async sendMessage(req: Request, res: Response) {
    try {
      if (this.isStreaming) {
        res.json({ status: 'error' });
        return;
      }

      this.isStreaming = true;

      res.writeHead(200, {
        Connection: 'keep-alive',
        'Cache-Control': 'no-cache',
        'Content-Type': 'text/event-stream',
      });

      if (!req.body.message) throw new Error('Message is required.');

      this.stream = await this.bot.chat(req.body.message);

      for await (const part of this.stream) {
        if (!this.isStreaming) break;
        if (typeof part === 'string') {
          res.write(`data: ${JSON.stringify({ error: part })}\n\n`);
        } else {
          res.write(`data: ${JSON.stringify(part)}\n\n`);
        }
      }

      res.on('close', async () => {
        if (typeof this.stream !== 'string') {
          await this.stream.return('');
        }
        this.isStreaming = false;
        res.end();
      });

      this.isStreaming = false;
      res.end();
    } catch (e) {
      res.write(
        `data: ${JSON.stringify({
          status: 'error',
          message: e.toString(),
        })}`,
      );
      this.isStreaming = false;
      res.end();
    }
  }

  @Post('/cancel')
  public async cancel(req: Request, res: Response) {
    try {
      if (!this.isStreaming) {
        return res.json({ status: 'error' });
      }

      if (typeof this.stream === 'string') {
        return res.json({ status: 'error' });
      }

      await this.stream.return('');
      this.isStreaming = false;
      return res.json({ status: 'success' });
    } catch (e) {
      return res.json({ status: 'error', message: e.toString() });
    }
  }
}
