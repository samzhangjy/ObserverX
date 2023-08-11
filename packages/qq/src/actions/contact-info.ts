import { Action, ActionConfig } from '@observerx/core';
import Contact from '../entity/Contact.js';
import { getGroupName, getUserName } from '../gocq.js';

export async function getContactInfo(_arg0: any, config: ActionConfig) {
  const contactRepository = config.dataSource.getRepository(Contact);
  return contactRepository.findOneBy({ parentId: config.parentId });
}

export async function refreshContactInfo(_arg0: any, config: ActionConfig) {
  const contactRepository = config.dataSource.getRepository(Contact);
  const contact = await contactRepository.findOneBy({ parentId: config.parentId });
  if (!contact) {
    return {
      status: 'error',
      message: 'Contact not found.',
    };
  }
  contact.name = config.parentId.startsWith('DM_')
    ? await getUserName(config.parentId.replace('DM_', ''))
    : await getGroupName(config.parentId.replace('GROUP_', ''));
  await contactRepository.save(contact);
  return { status: 'success' };
}

export const getContactInfoAction = new Action(
  {
    name: 'get_contact_info',
    description: 'Fetches information on current QQ group / user.',
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
  getContactInfo,
);

export const refreshContactInfoAction = new Action(
  {
    name: 'refresh_contact_info',
    description: 'Re-fetches information on current QQ group / user from the server.',
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
  refreshContactInfo,
);
