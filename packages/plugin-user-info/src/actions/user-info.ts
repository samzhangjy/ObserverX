import 'dotenv/config';
import { User, ActionBaseStatus, ActionParameters, Action, ActionBundle } from '@observerx/core';
import type ObserverX from '@observerx/core';

export interface UpdateUserInfoParameters extends ActionParameters {
  user_id: string;
  name?: string;
  personality?: string;
  hobbies?: string;
}

export async function updateUserInfo(userInfo: Partial<UpdateUserInfoParameters>, bot: ObserverX) {
  try {
    const userRepository = bot.dataSource.getRepository(User);
    let user = await userRepository.findOneBy({ id: userInfo.user_id });
    if (!user) {
      user = await userRepository.create(userInfo);
      if (user.id === process.env.ADMIN_ID) {
        user.isAdmin = true;
      }
      await userRepository.save(user);
      return ActionBaseStatus.SUCCESS;
    }
    if (user.id === process.env.ADMIN_ID) {
      user.isAdmin = true;
    }
    user.personality = userInfo.personality ?? user.personality;
    user.hobbies = userInfo.hobbies ?? user.hobbies;
    user.name = userInfo.name ?? user.name;
    await userRepository.save(user);
    // TODO: figure out why the below code won't work
    // await userRepository.update(
    //   { id: 1 },
    //   // removes undefined values from `userInfo`
    //   // from https://stackoverflow.com/questions/286141/remove-blank-attributes-from-an-object-in-javascript
    //   // eslint-disable-next-line @typescript-eslint/no-unused-vars
    //   Object.fromEntries(Object.entries(userInfo).filter(([_, v]) => v !== undefined)),
    // );
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
    return await userRepository.findOneBy({ id: userId });
  } catch (e) {
    return e.toString();
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
