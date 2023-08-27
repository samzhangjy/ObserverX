import 'dotenv/config'; // eslint-disable-line
import { User, ActionBaseStatus, ActionParameters, Action, ActionBundle } from '@observerx/core';
import type ObserverX from '@observerx/core';
import UserInfo from '../entities/UserInfo.js';

export interface UpdateUserInfoParameters extends ActionParameters {
  user_id: string;
  name?: string;
  personality?: string;
  hobbies?: string;
}

export async function updateUserInfo(
  { user_id: userId, name, hobbies, personality }: Partial<UpdateUserInfoParameters>,
  bot: ObserverX,
) {
  try {
    const userRepository = bot.dataSource.getRepository(User);
    const userInfoRepository = bot.dataSource.getRepository(UserInfo);
    let user = await userRepository.findOneBy({ id: userId });
    let userInfo = await userInfoRepository.findOneBy({ userId });
    if (!user) {
      user = await userRepository.create({
        id: userId,
        name,
      });
      if (user.id === process.env.ADMIN_ID) {
        user.isAdmin = true;
      }
      await userRepository.save(user);
      if (userInfo) {
        return ActionBaseStatus.SUCCESS;
      }
      userInfo = await userInfoRepository.create({
        personality,
        hobbies,
      });
      await userInfoRepository.save(userInfo);
      return ActionBaseStatus.SUCCESS;
    }
    user.name = name || user.name;
    await userRepository.save(user);
    if (!userInfo) {
      userInfo = await userInfoRepository.create({
        userId,
      });
    }
    userInfo.personality = personality || userInfo?.personality;
    userInfo.hobbies = hobbies || userInfo?.hobbies;
    await userInfoRepository.save(userInfo);
    return ActionBaseStatus.SUCCESS;
  } catch (e) {
    return e.toString();
  }
}

export interface GetUserInfoParameters extends ActionParameters {
  user_id: string;
}

export async function getUserInfo({ user_id: userId }: GetUserInfoParameters, bot: ObserverX) {
  try {
    const userRepository = bot.dataSource.getRepository(User);
    const userInfoRepository = bot.dataSource.getRepository(UserInfo);
    const user = await userRepository.findOneBy({ id: userId });
    const userInfo = await userInfoRepository.findOneBy({ userId });
    if (userInfo.userId) delete userInfo.userId;
    return {
      ...(user ?? {}),
      ...(userInfo ?? {}),
    };
  } catch (e) {
    return { message: e.toString(), status: 'error' };
  }
}

export const updateUserInfoAction = new Action(
  {
    name: 'update_user_info',
    description:
      'Updates user information in the database based on your experience interacting with the user. ' +
      'Parameters are all optional but at least one of them need to be specified to call this function.',
    parameters: {
      type: 'object',
      properties: {
        user_id: {
          type: 'string',
          description: 'The user ID that needed to update.',
        },
        name: {
          type: 'string',
          description: 'User name, e.g. "John".',
        },
        personality: {
          type: 'string',
          description:
            "Detailed description of the user's overall personality, in less than 1000 words.",
        },
        hobbies: {
          type: 'string',
          description:
            'User hobbies, can be updated over time based on your conversation with the user.',
        },
      },
      required: ['user_id'],
    },
  },
  updateUserInfo,
);

export const getUserInfoAction = new Action(
  {
    name: 'get_user_info',
    description:
      'Fetches user information from the database, where the information itself was written ' +
      'by yourself to describe the user.',
    parameters: {
      type: 'object',
      properties: {
        user_id: {
          type: 'string',
          description: 'ID of the user to fetch information from.',
        },
      },
      required: ['user_id'],
    },
  },
  getUserInfo,
);

const actions: ActionBundle = [updateUserInfoAction, getUserInfoAction];

export default actions;
