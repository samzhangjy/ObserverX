import User from '../entity/User.js';
import Action, { ActionConfig, ActionParameters, ChangeActionConfig } from './action.js';

export async function getBotModel(_arg0: any, config: ActionConfig) {
  return {
    model: config.model,
    status: 'success',
  };
}

export interface ChangeBotModelParameters extends ActionParameters {
  invoker_id: string;
  model: 'GPT-3.5' | 'GPT-4';
}

export async function changeBotModel(
  { invoker_id, model }: ChangeBotModelParameters,
  config: ActionConfig,
  changeConfig: ChangeActionConfig,
) {
  const userRepository = config.dataSource.getRepository(User);
  const user = await userRepository.findOneBy({ id: invoker_id });
  if (!user) {
    return {
      message: 'Unable to get invoker by given ID.',
      status: 'error',
    };
  }
  if (!user.isAdmin) {
    return {
      message: 'Invoker does not have permission to change bot model.',
      status: 'error',
    };
  }
  changeConfig({
    ...config,
    model,
  });
  return { status: 'success' };
}

export const getBotModelAction = new Action(
  {
    name: 'get_bot_model',
    description: 'Fetches current bot model, either it is GPT-3.5 or GPT-4.',
    parameters: {
      type: 'object',
      properties: {
        placeholder: {
          type: 'string',
          description: 'Placeholder parameter. Put in anything.',
        },
      },
      required: ['placeholder'],
    },
  },
  getBotModel,
);

export const changeBotModelAction = new Action(
  {
    name: 'change_bot_model',
    description: 'Changes bot model to either GPT-3.5 or GPT-4.',
    parameters: {
      type: 'object',
      properties: {
        invoker_id: {
          type: 'string',
          description: 'ID of this action invoker.',
        },
        model: {
          type: 'string',
          description: 'Bot model to change to, either GPT-3.5 or GPT-4.',
        },
      },
      required: ['invoker_id', 'model'],
    },
  },
  changeBotModel,
);
