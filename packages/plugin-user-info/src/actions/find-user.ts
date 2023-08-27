import ObserverX, { Action, ActionBundle, ActionParameters, User } from '@observerx/core';
import { ObjectLiteral } from 'typeorm';
import UserInfo from '../entities/UserInfo.js';

export interface FindUsersParameters extends ActionParameters {
  user_id: string;
  name: string;
  personality: string;
  hobbies: string;
}

export async function findUsers(filters: FindUsersParameters, bot: ObserverX) {
  try {
    const userRepository = bot.dataSource.getRepository(User);
    const userInfoRepository = bot.dataSource.getRepository(UserInfo);

    let query = await userRepository.createQueryBuilder().select('user').from(User, 'user');
    let whereCondition: 'where' | 'orWhere' = 'where';
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
      whereCondition = 'orWhere';
    };

    const extendFilters = (filter: keyof typeof filters) => {
      if (filters[filter] === undefined) return;
      if (typeof filter === 'string') {
        extendWhereQuery(
          `${['hobbies', 'personality'].includes(filter) ? 'userInfo' : 'user'}.${
            filter === 'user_id' ? 'id' : filter
          } ${typeof filters[filter] === 'string' ? 'ILIKE' : '='} :${filter}`,
          {
            [filter]:
              typeof filters[filter] === 'string' ? `%${filters[filter]}%` : filters[filter],
          },
        );
      }
    };

    Object.keys(filters).forEach(extendFilters);

    return await Promise.all(
      (await query.groupBy('user.id').getRawMany())
        .map(
          (user) =>
            Object.entries(user).reduce(
              (acc, [key, value]) => ({
                ...acc,
                [key.replace('user_', '').replace('userInfo_', '')]: value,
              }),
              {},
            ) as User,
        )
        .map(async (user) => {
          const userInfo = await userInfoRepository.findOneBy({
            userId: user.id,
          });
          if (userInfo?.userId) delete userInfo.userId;
          return {
            ...user,
            ...userInfo,
          };
        }),
    );
  } catch (e) {
    return { message: e.toString(), status: 'error' };
  }
}

export const findUsersAction = new Action(
  {
    name: 'find_users',
    description:
      'Finds users based on the given filters. Note that all filters are connected with OR operator.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'User name, e.g. "John".',
        },
        personality: {
          type: 'string',
          description: "User's overall personality to find.",
        },
        hobbies: {
          type: 'string',
          description: 'User hobbies to find.',
        },
      },
      required: [],
    },
  },
  findUsers,
);

const actions: ActionBundle = [findUsersAction];

export default actions;
