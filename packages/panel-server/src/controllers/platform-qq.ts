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
        contacts: await qq.invokePlatformAction('get_contacts'),
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
        model: await qq.invokePlatformAction('get_model', parentId),
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
      await qq.invokePlatformAction('set_model', parentId, model);
      res.json({ status: 'success' });
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
      await qq.invokePlatformAction('set_contact_enabled', parentId, enabled);
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
