import 'dotenv/config';
import { Controller, Get } from '@observerx/server-util';
import { type Request, type Response } from 'express';
import axios from 'axios';

@Controller('/billing')
class BillingController {
  @Get('/')
  public async getUsage(req: Request, res: Response) {
    try {
      const usage =
        (
          await axios.get('https://api.chatanywhere.cn/dashboard/billing/usage', {
            headers: {
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
          })
        ).data.total_usage / 100;
      const total =
        (
          await axios.get('https://api.chatanywhere.cn/dashboard/billing/subscription', {
            headers: {
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
          })
        ).data.hard_limit_usd * 1.0;
      res.json({
        usage,
        total,
        status: 'success',
      });
    } catch (e) {
      res.json({
        message: e.toString(),
        status: 'error',
      });
    }
  }
}

export default BillingController;
