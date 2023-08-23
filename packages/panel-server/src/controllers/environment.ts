import { Controller, Get, Post } from '@observerx/server-util';
import { type Request, type Response } from 'express';

@Controller('/environment')
class EnvironmentController {
  @Get('/')
  public getEnvironment(req: Request, res: Response) {
    try {
      const env = {};
      for (const key in process.env) {
        if (Object.prototype.hasOwnProperty.call(process.env, key) && !key.startsWith('npm')) {
          env[key] = process.env[key];
        }
      }
      res.json({
        env,
        status: 'success',
      });
    } catch (e) {
      res.json({
        message: e.toString(),
        status: 'error',
      });
    }
  }

  @Post('/')
  public setEnvironment(req: Request, res: Response) {
    try {
      const { env } = req.body;
      if (!env) {
        res.json({
          message: 'Env is required.',
          status: 'error',
        });
        return;
      }
      for (const key in env) {
        if (Object.prototype.hasOwnProperty.call(env, key)) {
          process.env[key] = env[key];
        }
      }
      res.json({ status: 'success' });
    } catch (e) {
      res.json({
        message: e.toString(),
        status: 'error',
      });
    }
  }
}

export default EnvironmentController;
