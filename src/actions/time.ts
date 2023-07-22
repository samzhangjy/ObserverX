import Action from './action.js';

export function getCurrentTime() {
  return new Date().toString();
}

const getCurrentTimeAction = new Action(
  {
    name: 'get_current_time',
    description: 'Returns current date and time.',
    parameters: {
      type: 'object',
      properties: {
        placeholder: {
          type: 'string',
          description: 'Placeholder to make the parameters non-empty. Fill in any value.',
        },
      },
      required: ['placeholder'],
    },
  },
  getCurrentTime,
);

export default getCurrentTimeAction;
