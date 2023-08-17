import type { V2_MetaFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import Shell from '~/components/Shell';
import isLoggedIn from '~/utils/login';
import { useLoaderData, useNavigate } from '@remix-run/react';
import { useEffect, useState } from 'react';
import { serverUrl } from '~/config';
import {
  Accordion,
  Badge,
  Container,
  createStyles,
  Divider,
  NumberInput,
  rem,
  Select,
  Switch,
  Text,
  Textarea,
  Title,
} from '@mantine/core';
import getAuth from '~/utils/auth';

const useStyles = createStyles((theme) => ({
  root: {
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0],
    borderRadius: theme.radius.md,
    border: `${rem(1)} solid ${
      theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[4]
    }`,
  },

  item: {
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0],
    border: `${rem(1)} solid transparent`,
    borderRadius: theme.radius.md,
    position: 'relative',
    zIndex: 0,
    transition: 'transform 150ms ease',

    '&[data-active]': {
      transform: 'scale(1.03)',
      backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
      boxShadow: theme.shadows.md,
      borderColor: theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[2],
      borderRadius: theme.radius.md,
      zIndex: 1,
    },
  },

  chevron: {
    '&[data-rotate]': {
      transform: 'rotate(-90deg)',
    },
  },
}));

export const meta: V2_MetaFunction = () => {
  return [
    { title: 'ObserverX' },
    { name: 'description', content: 'ObserverX admin panel.' },
    {
      name: 'viewport',
      content: 'width=device-width, initial-scale=1',
    },
    {
      charSet: 'utf-8',
    },
  ];
};

export async function loader() {
  return json({
    serverUrl,
  });
}

export interface Contact {
  parentId: string;
  name: string;
  type: 'SINGLE_USER_DIRECT_MESSAGE' | 'GROUP_MESSAGE';
  model: string;
  enabled: boolean;
  prompt: string;
  replyInterval: number;
}

export default function Qq() {
  const navigate = useNavigate();
  const { serverUrl } = useLoaderData<typeof loader>();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactModels, setContactModels] = useState<Record<string, string>>({});
  const [contactEnabled, setContactEnabled] = useState<Record<string, boolean>>({});
  const [contactReplyInterval, setContactReplyInterval] = useState<Record<string, number>>({});
  const [contactPrompt, setContactPrompt] = useState<Record<string, string>>({});

  const getContacts = async () => {
    const response = await fetch(`${serverUrl}/platforms/qq/contacts`, {
      headers: {
        Authorization: getAuth(),
      },
    });
    const data = await response.json();
    setContacts(data.contacts);
    const models: Record<string, string> = {};
    const enabled: Record<string, boolean> = {};
    const prompt: Record<string, string> = {};
    const replyInterval: Record<string, number> = {};
    data.contacts.forEach((contact: Contact) => {
      models[contact.parentId] = contact.model;
      enabled[contact.parentId] = contact.enabled;
      prompt[contact.parentId] = contact.prompt;
      replyInterval[contact.parentId] = contact.replyInterval;
    });
    setContactModels(models);
    setContactEnabled(enabled);
    setContactPrompt(prompt);
    setContactReplyInterval(replyInterval);
  };

  const setModel = async (parentId: string, model: string) => {
    const response = await fetch(`${serverUrl}/platforms/qq/contacts/${parentId}/model`, {
      method: 'POST',
      headers: {
        Authorization: getAuth(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
      }),
    });
    if (response.status !== 200) {
      return;
    }
    setContactModels({ ...contactModels, [parentId]: model });
  };

  const setEnabled = async (parentId: string, enabled: boolean) => {
    const response = await fetch(`${serverUrl}/platforms/qq/contacts/${parentId}/enabled`, {
      method: 'POST',
      headers: {
        Authorization: getAuth(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        enabled,
      }),
    });
    if (response.status !== 200) {
      return;
    }
    setContactEnabled({ ...contactEnabled, [parentId]: enabled });
  };

  const setReplyInterval = async (parentId: string, replyInterval: number) => {
    const response = await fetch(`${serverUrl}/platforms/qq/contacts/${parentId}/reply-interval`, {
      method: 'POST',
      headers: {
        Authorization: getAuth(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        replyInterval,
      }),
    });
    if (response.status !== 200) {
      return;
    }
    setContactReplyInterval({ ...contactReplyInterval, [parentId]: replyInterval });
  };

  const setPrompt = async (parentId: string, prompt: string) => {
    const response = await fetch(`${serverUrl}/platforms/qq/contacts/${parentId}/prompt`, {
      method: 'POST',
      headers: {
        Authorization: getAuth(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
      }),
    });
    if (response.status !== 200) {
      return;
    }
    setContactPrompt({ ...contactPrompt, [parentId]: prompt });
  };

  useEffect(() => {
    const checker = async () => {
      const loggedIn = await isLoggedIn(serverUrl);
      if (!loggedIn) {
        navigate('/login');
      }
    };
    checker();
    getContacts();
  }, []);

  const { classes } = useStyles();

  return (
    <Shell>
      <Container>
        <Title>QQ 平台</Title>
        <Divider mt={10} mb={30} />
        <Text mb={20}>共计 {contacts.length} 个联系配置。</Text>
        <Accordion classNames={classes} className={classes.root} variant="filled">
          {contacts.map((contact) => (
            <Accordion.Item value={contact.parentId} key={contact.parentId}>
              <Accordion.Control>
                <Text>
                  {contact.name}
                  <Badge ml={10}>{contact.parentId}</Badge>
                </Text>
              </Accordion.Control>
              <Accordion.Panel>
                <Select
                  label="模型"
                  placeholder="请选择"
                  data={[
                    { value: 'GPT-3.5', label: 'GPT-3.5' },
                    { value: 'GPT-4', label: 'GPT-4' },
                  ]}
                  value={contactModels[contact.parentId]}
                  onChange={(value) => {
                    setContactModels({ ...contactModels, [contact.parentId]: value as any });
                    setModel(contact.parentId, value as string);
                  }}
                  mb={20}
                />
                <Textarea
                  label="提示语"
                  placeholder="留空即为使用默认提示语"
                  value={contactPrompt[contact.parentId]}
                  onChange={(e) => {
                    setContactPrompt({
                      ...contactPrompt,
                      [contact.parentId]: e.currentTarget.value,
                    });
                    setPrompt(contact.parentId, e.currentTarget.value);
                  }}
                  mb={20}
                />
                <NumberInput
                  label="回复间隔"
                  description="ObserverX 将以此时间间隔（ms）检查新消息并向该联系人发送消息。"
                  value={contactReplyInterval[contact.parentId]}
                  onChange={(value) => {
                    setContactReplyInterval({
                      ...contactReplyInterval,
                      [contact.parentId]: value || 10000,
                    });
                    setReplyInterval(contact.parentId, value || 10000);
                  }}
                  min={1000}
                  mb={20}
                />
                <Switch
                  label={contactEnabled[contact.parentId] ? '已启用' : '已关闭'}
                  checked={contactEnabled[contact.parentId]}
                  onChange={(value) => {
                    setContactEnabled({
                      ...contactEnabled,
                      [contact.parentId]: value.currentTarget.checked,
                    });
                    setEnabled(contact.parentId, value.currentTarget.checked);
                  }}
                />
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </Container>
    </Shell>
  );
}
