import { Controller, Get, Post } from '@observerx/server-util';
import { type Request, type Response } from 'express';
import { getUser, updateUser } from '@observerx/core';
import { UserInfo } from '@observerx/plugin-user-info';
import { ObjectLiteral, Repository } from 'typeorm';
import { getDataSource } from '@observerx/database';
import User from '@observerx/core/dist/entities/User.js';

@Controller('/users')
class UserController {
  private readonly USERS_PER_PAGE = parseInt(process.env.PANEL_USERS_PER_PAGE ?? '10', 10);

  private readonly userRepository: Repository<User> = getDataSource().getRepository(User);

  private readonly userInfoRepository: Repository<UserInfo> =
    getDataSource().getRepository(UserInfo);

  private isValidSortBy(sortBy: any): sortBy is 'id' | 'name' {
    return ['id', 'name'].includes(sortBy);
  }

  private isValidOrder(order: any): order is 'DESC' | 'ASC' {
    return ['DESC', 'ASC'].includes(order);
  }

  /**
   * Fill TypeORM generated SQL with parameters.
   * From https://dev.to/avantar/how-to-output-raw-sql-with-filled-parameters-in-typeorm-14l4, edited.
   * @param sql Raw SQL generated by TypeORM.
   * @param params Parameters used in the SQL.
   * @private
   */
  private getQueryWithParams(sql: string, params: any[]) {
    let result = sql;

    params.forEach((value, i) => {
      const index = `$${i + 1}`;
      if (typeof value === 'string') {
        result = result.replace(index, `'${value}'`);
      }

      if (typeof value === 'object') {
        if (Array.isArray(value)) {
          result = result.replace(
            '?',
            value
              .map((element) => (typeof element === 'string' ? `"${element}"` : element))
              .join(','),
          );
        } else {
          result = result.replace(index, value);
        }
      }

      if (['number', 'boolean'].includes(typeof value)) {
        result = result.replace(index, value.toString());
      }
    });

    return result;
  }

  @Get('/')
  public async getUsers(req: Request, res: Response) {
    try {
      const page = parseInt((req.query.page as string) ?? '1', 10);
      const sortBy = req.query.sortBy ?? 'id';
      if (!this.isValidSortBy(sortBy)) {
        res.json({
          message: `Invalid sortBy: ${sortBy}`,
          status: 'error',
        });
        return;
      }
      const sortOrder = (req.query.order ?? 'ASC').toString().toUpperCase();
      if (!this.isValidOrder(sortOrder)) {
        res.json({
          message: `Invalid order: ${sortOrder}`,
          status: 'error',
        });
        return;
      }

      const filters = {
        name: req.query.name as string,
        userId: req.query.userId as string,
        isAdmin: req.query.isAdmin === undefined ? undefined : req.query.isAdmin === 'true',
        personality: req.query.personality as string,
        hobbies: req.query.hobbies as string,
      };

      let query = await this.userRepository.createQueryBuilder().select('user').from(User, 'user');
      let whereCondition: 'where' | 'andWhere' = 'where';
      const requiresUserInfoFilter = filters.personality || filters.hobbies;
      if (requiresUserInfoFilter) {
        query = query.innerJoinAndMapOne(
          'user.info',
          UserInfo,
          'userInfo',
          'userInfo.userId = user.id',
        );
      }

      const extendWhereQuery = (where: string, parameters: ObjectLiteral) => {
        query = query[whereCondition](where, parameters);
        whereCondition = 'andWhere';
      };

      const extendFilters = (filter: keyof typeof filters) => {
        if (filters[filter] === undefined) return;
        extendWhereQuery(
          `${['hobbies', 'personality'].includes(filter) ? 'userInfo' : 'user'}.${
            filter === 'userId' ? 'id' : filter
          } ${typeof filters[filter] === 'string' ? 'ILIKE' : '='} :${filter}`,
          {
            [filter]:
              typeof filters[filter] === 'string' ? `%${filters[filter]}%` : filters[filter],
          },
        );
      };

      Object.keys(filters).forEach(extendFilters);

      const [sqlWithoutParams, params] = query.getQueryAndParameters();
      const rawSql = this.getQueryWithParams(sqlWithoutParams, params);

      let getManyQuery = await query
        .orderBy(`user.${sortBy}`, sortOrder)
        .groupBy('user.id')
        .take(this.USERS_PER_PAGE)
        .skip((page - 1) * this.USERS_PER_PAGE);

      if (requiresUserInfoFilter) {
        getManyQuery = getManyQuery.addGroupBy('userInfo.userId');
      }

      const users = await getManyQuery.getRawMany();

      const total = parseInt(
        (
          await this.userRepository.query(
            rawSql.replace(
              /(SELECT\s)(.*?)(\sFROM.*?)/,
              `$1COUNT(DISTINCT "user"."id") AS "cnt"$3`,
            ),
          )
        )[0].cnt,
        10,
      );

      let usersWithInfo: (UserInfo & User)[] = users.map(
        (user) =>
          Object.entries(user).reduce(
            (acc, [key, value]) => ({
              ...acc,
              [key.replace('user_', '').replace('userInfo_', '')]: value,
            }),
            {},
          ) as UserInfo & User,
      );
      if (!requiresUserInfoFilter) {
        usersWithInfo = [];
        for (const user of users) {
          // eslint-disable-next-line no-await-in-loop
          const userInfo = await this.userInfoRepository.findOneBy({ userId: user.user_id });
          if (userInfo) delete userInfo.userId;
          usersWithInfo.push({
            ...(Object.entries(user).reduce(
              (acc, [key, value]) => ({
                ...acc,
                [key.replace('user_', '').replace('userInfo_', '')]: value,
              }),
              {},
            ) as UserInfo & User),
            ...userInfo,
          });
        }
      }
      res.json({
        users: usersWithInfo,
        total,
        totalPages: Math.ceil(total / this.USERS_PER_PAGE),
        perPage: this.USERS_PER_PAGE,
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
      const userInfo = await this.userInfoRepository.findOneBy({ userId: user.id });
      res.json({
        user: {
          ...user,
          ...userInfo,
        },
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
      const { name, personality, hobbies, isAdmin } = user;
      const newUser = await updateUser({ name, isAdmin, id: userId });
      let userInfo = await this.userInfoRepository.findOneBy({ userId });
      if (!userInfo) {
        userInfo = new UserInfo();
        userInfo.userId = userId;
      }
      userInfo.hobbies = hobbies || userInfo.hobbies;
      userInfo.personality = personality || userInfo.personality;
      const newUserInfo = await this.userInfoRepository.save(userInfo);
      res.json({ user: { ...newUser, ...newUserInfo }, status: 'success' });
    } catch (e) {
      res.json({
        message: e.toString(),
        status: 'error',
      });
    }
  }
}

export default UserController;
