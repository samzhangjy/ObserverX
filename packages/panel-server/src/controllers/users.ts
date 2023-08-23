import { Controller, Get, Post } from '@observerx/server-util';
import { type Request, type Response } from 'express';
import { getUsers, getUser, updateUser } from '@observerx/core';

@Controller('/users')
class UserController {
  private readonly USERS_PER_PAGE = parseInt(process.env.PANEL_USERS_PER_PAGE ?? '10', 10);

  @Get('/')
  public async getUsers(req: Request, res: Response) {
    try {
      const page = parseInt((req.query.page as string) ?? '1', 10);
      const { users, total } = await getUsers({
        take: this.USERS_PER_PAGE,
        skip: (page - 1) * this.USERS_PER_PAGE,
      });
      res.json({
        users,
        total,
        totalPages: Math.ceil(total / this.USERS_PER_PAGE),
        status: 'success',
      });
    } catch (e) {
      res.json({
        message: e.toString(),
        status: 'error',
      });
    }
  }

  @Get('/:userId')
  public async getUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const user = await getUser(userId);
      res.json({
        user,
        status: 'success',
      });
    } catch (e) {
      res.json({
        message: e.toString(),
        status: 'error',
      });
    }
  }

  @Post('/:userId')
  public async updateUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { user } = req.body;
      if (!user) {
        res.json({
          message: 'User is required.',
          status: 'error',
        });
        return;
      }
      const newUser = await updateUser({ ...user, id: userId });
      res.json({ user: newUser, status: 'success' });
    } catch (e) {
      res.json({
        message: e.toString(),
        status: 'error',
      });
    }
  }
}

export default UserController;
