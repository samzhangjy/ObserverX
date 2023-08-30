import type { V2_MetaFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import Shell from '~/components/Shell';
import isLoggedIn from '~/utils/login';
import { useLoaderData, useNavigate } from '@remix-run/react';
import { useEffect, useState } from 'react';
import { serverUrl } from '~/config';
import getAuth from '~/utils/auth';
import {
  Button,
  Card,
  Center,
  Container,
  createStyles,
  Divider,
  Group,
  Pagination,
  rem,
  RingProgress,
  SimpleGrid,
  Skeleton,
  Text,
  Title,
  useMantineTheme,
} from '@mantine/core';

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

interface Parent {
  parentId: string;
  messages: number;
  tokens: number;
}

const useStyles = createStyles((theme) => ({
  card: {
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
  },

  label: {
    fontFamily: theme.fontFamilyMonospace,
    fontWeight: 700,
    lineHeight: 1,
  },

  lead: {
    fontFamily: theme.fontFamily,
    fontWeight: 700,
    fontSize: rem(22),
    lineHeight: 1,
  },

  inner: {
    display: 'flex',

    [theme.fn.smallerThan('xs')]: {
      flexDirection: 'column',
    },
  },

  ring: {
    flex: 1,
    display: 'flex',
    justifyContent: 'flex-end',

    [theme.fn.smallerThan('xs')]: {
      justifyContent: 'center',
      marginTop: theme.spacing.md,
    },
  },
}));

export default function MessagesIndex() {
  const navigate = useNavigate();
  const { serverUrl } = useLoaderData<typeof loader>();
  const [parents, setParents] = useState<Parent[]>([]);
  const [totalParents, setTotalParents] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);
  const [isFetching, setIsFetching] = useState(true);
  const { classes } = useStyles();
  const theme = useMantineTheme();

  const getParents = async (page = 1) => {
    setIsFetching(true);
    let url = `${serverUrl}/messages/parents?page=${page}`;
    const response = await fetch(url, {
      headers: {
        Authorization: getAuth(),
      },
    });
    const data = await response.json();

    setParents(data.parents);
    setTotalParents(data.total);
    setTotalPages(data.totalPages);
    setTotalTokens(data.totalTokens);
    setIsFetching(false);
  };

  useEffect(() => {
    const checker = async () => {
      const loggedIn = await isLoggedIn(serverUrl);
      if (!loggedIn) {
        navigate('/login');
      }
    };
    checker().then(() => {
      getParents();
    });
  }, []);

  return (
    <Shell>
      <Container my={60}>
        <Title order={1}>消息</Title>
        <Divider mt={10} mb={30} />
        <Text mb={20}>共计 {totalParents} 个消息主体。</Text>
        <Skeleton visible={isFetching} height="100%" mih={400} radius="md">
          <SimpleGrid
            cols={2}
            spacing="lg"
            breakpoints={[{ maxWidth: 'xs', cols: 1, spacing: 'sm' }]}
          >
            {parents.map((parent) => (
              <Card key={parent.parentId} withBorder p="xl" radius="md" className={classes.card}>
                <div className={classes.inner}>
                  <div>
                    <Text fz="xl" className={classes.label}>
                      {parent.parentId}
                    </Text>
                    <div>
                      <Text className={classes.lead} mt={30}>
                        {parent.messages}
                      </Text>
                      <Text fz="xs" color="dimmed">
                        条消息
                      </Text>
                    </div>
                    <Group mt="lg">
                      <div>
                        <Text className={classes.label}>{parent.tokens}</Text>
                        <Text size="xs" color="dimmed">
                          已用 Tokens
                        </Text>
                      </div>
                    </Group>
                  </div>

                  <div className={classes.ring}>
                    <RingProgress
                      roundCaps
                      thickness={6}
                      size={150}
                      sections={[
                        { value: (parent.tokens / totalTokens) * 100, color: theme.primaryColor },
                      ]}
                      label={
                        <div>
                          <Text ta="center" fz="lg" className={classes.label}>
                            {((parent.tokens / totalTokens) * 100).toFixed(0)}%
                          </Text>
                          <Text ta="center" fz="xs" c="dimmed">
                            占总 Tokens 用量
                          </Text>
                        </div>
                      }
                    />
                  </div>
                </div>
                <Button
                  variant="light"
                  onClick={() => {
                    navigate(`/messages/${parent.parentId}`);
                  }}
                  fullWidth
                  radius="md"
                  mt={20}
                >
                  查看
                </Button>
              </Card>
            ))}
          </SimpleGrid>
          <Center>
            <Pagination total={totalPages} onChange={(page) => getParents(page)} mt={20} />
          </Center>
        </Skeleton>
      </Container>
    </Shell>
  );
}
