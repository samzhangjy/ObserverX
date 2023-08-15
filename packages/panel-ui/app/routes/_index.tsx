import type { V2_MetaFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import Shell from '~/components/Shell';
import isLoggedIn from '~/utils/login';
import { useLoaderData, useNavigate } from '@remix-run/react';
import { useEffect, useState } from 'react';
import { serverUrl } from '~/config';
import getAuth from '~/utils/auth';
import {
  ActionIcon,
  Button,
  Center,
  createStyles,
  Divider,
  Group,
  Modal,
  Paper,
  rem,
  RingProgress,
  SimpleGrid,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconCoin, IconDiscount2, IconEdit, IconReceipt2, IconUserPlus } from '@tabler/icons-react';

const useStyles = createStyles((theme) => ({
  root: {
    padding: `calc(${theme.spacing.xl} * 1.5)`,
  },

  value: {
    fontSize: rem(16),
    fontWeight: 500,
    lineHeight: 1,
  },

  diff: {
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
  },

  icon: {
    color: theme.colorScheme === 'dark' ? theme.colors.dark[3] : theme.colors.gray[4],
  },

  title: {
    fontWeight: 700,
    textTransform: 'uppercase',
  },
}));

const icons = {
  user: IconUserPlus,
  discount: IconDiscount2,
  receipt: IconReceipt2,
  coin: IconCoin,
};

export const meta: V2_MetaFunction = () => {
  return [
    { title: 'ObserverX' },
    { name: 'description', content: 'ObserverX admin panel.' },
    {
      name: 'viewport',
      content: 'width=device-width, initial-scale=1',
    },
  ];
};

export async function loader() {
  return json({
    serverUrl,
  });
}

export default function Index() {
  const navigate = useNavigate();
  const { serverUrl } = useLoaderData<typeof loader>();
  const [status, setStatus] = useState<any>({});
  const [env, setEnv] = useState<Record<string, any>>({});
  const getStatus = async () => {
    const status = await fetch(`${serverUrl}/system/status`, {
      headers: {
        Authorization: getAuth(),
      },
    });
    setStatus(await status.json());
  };
  const getEnv = async () => {
    const env = await fetch(`${serverUrl}/environment`, {
      headers: {
        Authorization: getAuth(),
      },
    });
    const vars = (await env.json()).env;
    setEnv(vars);
    setModelsValues(vars);
  };

  const setServerEnv = async (key: string, value: string) => {
    await fetch(`${serverUrl}/environment`, {
      headers: {
        Authorization: getAuth(),
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify({
        env: {
          [key]: value,
        },
      }),
    });
    await getEnv();
  };

  useEffect(() => {
    const checker = async () => {
      const loggedIn = await isLoggedIn(serverUrl);
      if (!loggedIn) {
        navigate('/login');
      }
    };
    getStatus();
    getEnv();
    setInterval(getStatus, 1000);
    checker();
  }, []);

  const { classes } = useStyles();
  const [modelsOpened, setModelsOpened] = useState<Record<string, boolean>>({});
  const [modelsValues, setModelsValues] = useState<Record<string, string>>({});

  const Stat = ({ title, progress, text }: { title: string, progress: number, text: string }) => (
    <Paper withBorder p='md' radius='md' key={title}>
      <Group position='apart'>
        <Text size='xs' color='dimmed' className={classes.title}>
          {title}
        </Text>
        <RingProgress
          size={80}
          roundCaps
          thickness={8}
          sections={[{ value: progress, color: 'blue' }]}
          label={
            <Center>
              {progress}%
            </Center>
          }
        />
      </Group>

      <Group align='flex-end' spacing='xs' mt={10}>
        <Text className={classes.value}>{text}</Text>
      </Group>
    </Paper>
  );

  return (
    <Shell>
      <Title>服务器</Title>
      <Divider mt={10} mb={30} />
      <SimpleGrid
        cols={3}
        breakpoints={[
          { maxWidth: 'md', cols: 2 },
          { maxWidth: 'xs', cols: 1 },
        ]}
        spacing={10}
      >
        <Stat title={`CPU - ${status?.cpu?.count ?? 0} 核`} progress={Math.round(status?.cpu?.usage ?? 0)}
              text={status?.cpu?.model} />
        <Stat title={`RAM - ${status?.mem?.total ?? '0 GiB'}`} progress={Math.round(status?.mem?.usage ?? 0)}
              text={`已用 ${status?.mem?.used}`} />
        <Stat title={`SSD - ${status?.drive?.total ?? '0 GB'}`} progress={Math.round(status?.drive?.usage ?? 0)}
              text={`已用 ${status?.drive?.used}`} />
      </SimpleGrid>
      <Title order={2} my={30}>环境变量</Title>
      <Table maw='100%'>
        <thead>
        <tr>
          <th>名称</th>
          <th>值</th>
          <th>操作</th>
        </tr>
        </thead>
        <tbody>
        {Object.entries(env).map(([key, value]: [string, string]) => (
          <tr key={key}>
            <td>{key}</td>
            <td>{value.length > 100 ? value.substring(0, 100) + '...' : value}</td>
            <td><ActionIcon variant='light' onClick={() => setModelsOpened({ ...modelsOpened, [key]: true })}>
              <IconEdit size={16} />
            </ActionIcon></td>
            <Modal opened={modelsOpened[key]} onClose={() => setModelsOpened({ ...modelsOpened, [key]: false })}
                   title='修改变量'>
              <TextInput label='值' value={modelsValues[key]}
                         onChange={(e) => setModelsValues({ ...modelsValues, [key]: e.currentTarget.value })} />
              <Button onClick={() => {
                setServerEnv(key, modelsValues[key]);
                setModelsOpened({ ...modelsOpened, [key]: false });
              }} mt={10}>修改</Button>
            </Modal>
          </tr>
        ))}
        </tbody>
      </Table>
    </Shell>
  );
}
