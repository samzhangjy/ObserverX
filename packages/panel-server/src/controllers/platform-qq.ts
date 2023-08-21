import { Controller, Get, Post } from '@observerx/server-util';
import { type Request, type Response } from 'express';
import type PlatformQQ from '@observerx/qq';
import platforms from '../platforms.js';

@Controller('/platforms/qq')
class PlatformQQController {
  @Get('/contacts')
  public async getContacts(req: Request, res: Response) {
    try {
      const qq = platforms.get('qq') as PlatformQQ;
      res.json({
        contacts: await qq.getContacts(),
        status: 'success',
      });
    } catch (e) {
      res.json({
        message: e.toString(),
        status: 'error',
      });
    }
  }

  @Get('/contacts/:parentId/model')
  public async getModel(req: Request, res: Response) {
    try {
      const qq = platforms.get('qq') as PlatformQQ;
      const { parentId } = req.params;
      res.json({
        model: await qq.getBotModel(parentId),
        status: 'success',
      });
    } catch (e) {
      res.json({
        message: e.toString(),
        status: 'error',
      });
    }
  }

  @Post('/contacts/:parentId/model')
  public async setModel(req: Request, res: Response) {
    try {
      const qq = platforms.get('qq') as PlatformQQ;
      const { parentId } = req.params;
      const { model } = req.body;
      if (!model) {
        res.json({
          message: 'Model is required.',
          status: 'error',
        });
        return;
      }
      await qq.setBotModel(parentId, model);
      res.json({ status: 'success' });
    } catch (e) {
      res.json({
        message: e.toString(),
        status: 'error',
      });
    }
  }

  @Post('/contacts/:parentId/prompt')
  public async setPrompt(req: Request, res: Response) {
    try {
      const qq = platforms.get('qq') as PlatformQQ;
      const { parentId } = req.params;
      const { prompt } = req.body;
      await qq.setContactPrompt(parentId, prompt);
      res.json({ status: 'success' });
    } catch (e) {
      res.json({
        message: e.toString(),
        status: 'error',
      });
    }
  }

  @Post('/contacts/:parentId/reply-interval')
  public async setReplyInterval(req: Request, res: Response) {
    try {
      const qq = platforms.get('qq') as PlatformQQ;
      const { parentId } = req.params;
      const { replyInterval } = req.body;
      if (!replyInterval) {
        res.json({
          message: 'Reply interval is required.',
          status: 'error',
        });
        return;
      }
      await qq.setContactReplyInterval(parentId, replyInterval);
      res.json({ status: 'success' });
    } catch (e) {
      res.json({
        message: e.toString(),
        status: 'error',
      });
    }
  }

  @Get('/contacts/:parentId')
  public async getContact(req: Request, res: Response) {
    try {
      const qq = platforms.get('qq') as PlatformQQ;
      const { parentId } = req.params;
      res.json({
        contact: await qq.getContact(parentId),
        status: 'success',
      });
    } catch (e) {
      res.json({
        message: e.toString(),
        status: 'error',
      });
    }
  }

  @Post('/contacts/:parentId/enabled')
  public async setContactEnabled(req: Request, res: Response) {
    try {
      const qq = platforms.get('qq') as PlatformQQ;
      const { parentId } = req.params;
      const { enabled } = req.body;
      if (enabled === undefined) {
        res.json({
          message: 'Enabled is required.',
          status: 'error',
        });
        return;
      }
      await qq.setContactEnabled(parentId, enabled);
      res.json({ status: 'success' });
    } catch (e) {
      res.json({
        message: e.toString(),
        status: 'error',
      });
    }
  }

  @Post('/restart')
  public async restart(req: Request, res: Response) {
    try {
      const qq = platforms.get('qq') as PlatformQQ;
      qq.stop();
      qq.initialize();
      qq.start();
      res.json({ status: 'success' });
    } catch (e) {
      res.json({
        message: e.toString(),
        status: 'error',
      });
    }
  }
}

export default PlatformQQController;
