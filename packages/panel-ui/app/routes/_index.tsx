import type { V2_MetaFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import Shell from '~/components/Shell';
import isLoggedIn from '~/utils/login';
import { useLoaderData, useLocation, useNavigate } from '@remix-run/react';
import { useEffect, useRef, useState } from 'react';
import { serverUrl } from '~/config';
import getAuth from '~/utils/auth';
import {
  ActionIcon,
  Badge,
  Button,
  Center,
  Container,
  createStyles,
  Divider,
  Group,
  Modal,
  Paper,
  rem,
  RingProgress,
  ScrollArea,
  SimpleGrid,
  Table,
  Text,
  TextInput,
  Title,
  useMantineTheme,
} from '@mantine/core';
import { IconEdit, IconPlus } from '@tabler/icons-react';
import { useMediaQuery } from '@mantine/hooks';

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

export default function Index() {
  const navigate = useNavigate();
  const { serverUrl } = useLoaderData<typeof loader>();
  const [status, setStatus] = useState<any>({});
  const [env, setEnv] = useState<Record<string, any>>({});
  const [billing, setBilling] = useState({
    usage: 0,
    total: 0,
  });
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);
  const statusIntervalId = useRef<number>();
  const [serverStatus, setServerStatus] = useState<'loading' | 'online' | 'offline'>('loading');

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
    setModalsValues(vars);
  };

  const getBilling = async () => {
    const response = await fetch(`${serverUrl}/billing`, {
      headers: {
        Authorization: getAuth(),
      },
    });
    const data = await response.json();
    setBilling({
      usage: data.usage,
      total: data.total,
    });
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
    checker()
      .then(() => {
        setServerStatus('online');
        getStatus();
        getEnv();
        getBilling();
        statusIntervalId.current = window.setInterval(getStatus, 1000);
      })
      .catch(() => {
        setServerStatus('offline');
      });
    return () => clearInterval(statusIntervalId.current);
  }, []);

  const { classes } = useStyles();
  const [modalsOpened, setModalsOpened] = useState<Record<string, boolean>>({});
  const [modalsValues, setModalsValues] = useState<Record<string, string>>({});
  const [createEnvModalOpened, setCreateEnvModalOpened] = useState(false);
  const [createEnvModalValue, setCreateEnvModalValue] = useState({
    key: '',
    value: '',
  });

  const Stat = ({ title, progress, text }: { title: string; progress: number; text: string }) => (
    <Paper withBorder p="md" radius="md" key={title}>
      <Group position="apart">
        <Text size="xs" color="dimmed" className={classes.title}>
          {title}
        </Text>
        <RingProgress
          size={80}
          roundCaps
          thickness={8}
          sections={[
            { value: progress, color: progress < 60 ? 'blue' : progress < 80 ? 'yellow' : 'red' },
          ]}
          label={<Center>{progress}%</Center>}
        />
      </Group>

      <Group align="flex-end" spacing="xs" mt={10}>
        <Text className={classes.value}>{text}</Text>
      </Group>
    </Paper>
  );

  return (
    <Shell>
      <Container my={60}>
        <Group position="apart" mb={20}>
          <Title>服务器</Title>
          <Badge
            size="lg"
            variant="dot"
            color={
              serverStatus === 'loading' ? 'blue' : serverStatus === 'online' ? 'green' : 'red'
            }
          >
            {serverStatus === 'loading' ? '加载中' : serverStatus === 'online' ? '在线' : '离线'}
          </Badge>
        </Group>
        <Divider mt={10} mb={30} />
        <SimpleGrid
          cols={2}
          breakpoints={[
            { maxWidth: 'md', cols: 2 },
            { maxWidth: 'xs', cols: 1 },
          ]}
          spacing={10}
        >
          <Stat
            title={`CPU - ${status?.cpu?.count ?? 0} 核`}
            progress={Math.round(status?.cpu?.usage ?? 0)}
            text={status?.cpu?.model}
          />
          <Stat
            title={`RAM - ${status?.mem?.total ?? '0 GiB'}`}
            progress={Math.round(status?.mem?.usage ?? 0)}
            text={`已用 ${status?.mem?.used}`}
          />
          <Stat
            title={`SSD - ${status?.drive?.total ?? '0 GB'}`}
            progress={Math.round(status?.drive?.usage ?? 0)}
            text={`已用 ${status?.drive?.used}`}
          />
          <Stat
            title={`OpenAI API - $${billing.total ?? '0.00'}`}
            progress={Math.round(billing.total ? (billing.usage / billing.total) * 100 : 0)}
            text={`已用 $${billing.usage.toFixed(2)}`}
          />
        </SimpleGrid>
        <Group position="apart" my={30}>
          <Title order={2}>环境变量</Title>
          <Button
            size="sm"
            variant="light"
            leftIcon={<IconPlus size="1rem" />}
            onClick={() => setCreateEnvModalOpened(true)}
          >
            创建变量
          </Button>
        </Group>
        <Table maw="100%">
          <thead>
            <tr>
              <th>键</th>
              <th>值</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(env).map(([key, value]: [string, string]) => (
              <tr key={key}>
                <td>
                  <ScrollArea maw={isMobile ? 100 : 200}>{key}</ScrollArea>
                </td>
                <td>
                  <ScrollArea maw={isMobile ? 130 : 200}>{value}</ScrollArea>
                </td>
                <td>
                  <ActionIcon
                    variant="light"
                    onClick={() => setModalsOpened({ ...modalsOpened, [key]: true })}
                  >
                    <IconEdit size={16} />
                  </ActionIcon>
                </td>
                <Modal
                  opened={modalsOpened[key]}
                  onClose={() => setModalsOpened({ ...modalsOpened, [key]: false })}
                  title="修改变量"
                >
                  <TextInput
                    label="值"
                    value={modalsValues[key]}
                    onChange={(e) =>
                      setModalsValues({ ...modalsValues, [key]: e.currentTarget.value })
                    }
                  />
                  <Button
                    onClick={() => {
                      setServerEnv(key, modalsValues[key]);
                      setModalsOpened({ ...modalsOpened, [key]: false });
                    }}
                    mt={10}
                    fullWidth
                    variant="light"
                  >
                    修改
                  </Button>
                </Modal>
              </tr>
            ))}
          </tbody>
        </Table>
        <Modal
          opened={createEnvModalOpened}
          onClose={() => setCreateEnvModalOpened(false)}
          title="创建变量"
        >
          <TextInput
            label="键"
            value={createEnvModalValue.key}
            onChange={(e) =>
              setCreateEnvModalValue({ ...createEnvModalValue, key: e.currentTarget.value })
            }
          />
          <TextInput
            label="值"
            value={createEnvModalValue.value}
            onChange={(e) =>
              setCreateEnvModalValue({ ...createEnvModalValue, value: e.currentTarget.value })
            }
            mt={10}
          />
          <Button
            onClick={() => {
              setServerEnv(createEnvModalValue.key, createEnvModalValue.value);
              setCreateEnvModalOpened(false);
              setCreateEnvModalValue({
                key: '',
                value: '',
              });
            }}
            mt={10}
            fullWidth
            variant="light"
          >
            创建变量
          </Button>
        </Modal>
      </Container>
    </Shell>
  );
}
