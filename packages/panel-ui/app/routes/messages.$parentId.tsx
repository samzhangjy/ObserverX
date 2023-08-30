import type { V2_MetaFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import Shell from '~/components/Shell';
import isLoggedIn from '~/utils/login';
import { useLoaderData, useNavigate, useParams } from '@remix-run/react';
import { useEffect, useRef, useState } from 'react';
import { serverUrl } from '~/config';
import getAuth from '~/utils/auth';
import {
  Affix,
  Badge,
  Box,
  Button,
  Center,
  Container,
  createStyles,
  Divider,
  Group,
  Loader,
  Paper,
  rem,
  ScrollArea,
  Skeleton,
  Text,
  Title,
  Transition,
} from '@mantine/core';
import { DateTime } from 'luxon';
import { useInterval } from '@mantine/hooks';
import { IconArrowDown } from '@tabler/icons-react';

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

interface Message {
  id: number;
  role: 'user' | 'assistant' | 'system' | 'function';
  timestamp: string;
  content: string;
  action: {
    name: string;
    arguments: string;
  } | null;
  actionName?: string;
  tokens?: number;
  parentId: string;
  sender: {
    id: number;
    name?: string;
    isAdmin: boolean;
  };
}

const useStyles = createStyles((theme) => ({
  main: {
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
    padding: 0,
    borderRadius: theme.radius.md,
  },

  item: {
    paddingLeft: theme.spacing.lg,
    paddingRight: theme.spacing.lg,
    paddingTop: rem(3),
    paddingBottom: rem(3),
    margin: 0,
    wordBreak: 'break-word',

    '&:hover': {
      backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[1],
    },
  },

  itemContent: {
    fontFamily: theme.fontFamilyMonospace,
    fontSize: rem(14),
    wordBreak: 'break-word',
  },

  itemTimestamp: {
    fontFamily: theme.fontFamilyMonospace,
    fontSize: rem(14),
  },

  itemActionCall: {
    fontFamily: theme.fontFamilyMonospace,
    fontSize: rem(14),
  },

  itemActionCallFailed: {
    fontSize: rem(14),
  },

  unreadButton: {
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.gray[0] : theme.colors.dark[7],
    color: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.colors.gray[0],
    transition: 'all 200ms !important',

    '&:hover': {
      backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[3],
      color: theme.colorScheme === 'dark' ? theme.colors.gray[0] : theme.colors.dark[7],
    },
  },
}));

export default function MessagesDetail() {
  const navigate = useNavigate();
  const { serverUrl } = useLoaderData<typeof loader>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const { classes } = useStyles();
  const [scrollPosition, onScrollPositionChange] = useState({ x: 0, y: 0 });
  const curScrollHeight = useRef(0);
  const [page, setPage] = useState(1);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const { parentId } = useParams();
  const viewport = useRef<HTMLDivElement>(null);
  const lastMessageId = useRef<number>();
  const unreadMessages = useRef<number>(0);

  const dedupeMessages = (messages: Message[]) => {
    const map: Map<number, boolean> = new Map<number, boolean>();
    const deduped: Message[] = [];
    for (const message of messages) {
      if (map.get(message.id)) continue;
      deduped.push(message);
      map.set(message.id, true);
    }
    return deduped;
  };

  const sortMessages = (messages: Message[]) =>
    [...messages].sort((a, b) =>
      new Date(a.timestamp) < new Date(b.timestamp)
        ? -1
        : new Date(a.timestamp) === new Date(b.timestamp)
        ? 0
        : 1,
    );

  const getLatestMessages = async () => {
    if (isFetching || (lastMessageId.current ?? 0) < 0) return;
    const url = `${serverUrl}/messages/${parentId}/latest?lastMessageId=${lastMessageId.current}`;
    interval.stop();
    const response = await fetch(url, {
      headers: {
        Authorization: getAuth(),
      },
    });
    const data = await response.json();

    if (
      viewport.current!.scrollHeight - (scrollPosition.y + viewport.current!.offsetHeight) >
      100
    ) {
      unreadMessages.current += data.messages.length;
    }

    if (data.messages.length) {
      setMessages((messages) =>
        sortMessages(dedupeMessages([...messages, ...data.messages.reverse()])),
      );
      setTimeout(() => {
        if (
          viewport.current!.scrollHeight - (scrollPosition.y + viewport.current!.offsetHeight) >
          100
        )
          return;
        viewport.current!.scrollTo({ top: viewport.current!.scrollHeight });
      }, 50);
      lastMessageId.current = data?.messages[0]?.id;
    }
    interval.start();
  };

  const interval = useInterval(getLatestMessages, 5000);

  const getMessages = async (page = 1): Promise<Message[]> => {
    if (!hasMore) return messages;
    const url = `${serverUrl}/messages/${parentId}?page=${page}`;
    const response = await fetch(url, {
      headers: {
        Authorization: getAuth(),
      },
    });
    const data = await response.json();

    if (data?.messages && data.messages.length === 0) {
      setHasMore(false);
    }

    setMessages((messages) =>
      sortMessages(dedupeMessages([...data.messages.reverse(), ...messages])),
    );
    setIsFetching(false);
    return [...data.messages.reverse(), ...messages];
  };

  useEffect(() => {
    const checker = async () => {
      const loggedIn = await isLoggedIn(serverUrl);
      if (!loggedIn) {
        navigate('/login');
      }
    };
    checker().then(() => {
      setIsFetching(true);
      getMessages()
        .then((newMessages) => {
          lastMessageId.current = newMessages[0].id;
          interval.start();
        })
        .then(() => getMessages(2))
        .then(() => {
          viewport.current?.scrollTo({ top: viewport.current?.scrollHeight, behavior: 'instant' });
        });
    });
    return interval.stop;
  }, []);

  useEffect(() => {
    if (
      viewport.current!.scrollHeight - (scrollPosition.y + viewport.current!.offsetHeight) <=
      100
    ) {
      unreadMessages.current = 0;
    }
    if (scrollPosition.y || isFetchingMore || isFetching) return;
    curScrollHeight.current = viewport.current!.scrollHeight;
    setIsFetchingMore(true);
    getMessages(page + 1).then(() => {
      setIsFetchingMore(false);
    });
    setPage((page) => page + 1);
  }, [scrollPosition]);

  useEffect(() => {
    if (isFetchingMore) return;
    viewport.current?.scrollTo({
      top: viewport.current!.scrollHeight - curScrollHeight.current,
    });
  }, [isFetchingMore]);

  const ActionMessage = ({ message }: { message: Message }) => {
    try {
      const args: Record<string, any> = JSON.parse(message.action!.arguments);
      return (
        <Text className={classes.itemActionCall} color="dimmed">
          {message.action!.name}(
          {Object.entries(args).map(([key, value], index) => (
            <>
              <Text span className={classes.itemActionCall}>
                {key}=
              </Text>
              <Text span italic className={classes.itemActionCall}>
                {value}
              </Text>
              {index !== Object.keys(args).length - 1 && (
                <Text span className={classes.itemActionCall}>
                  ,{' '}
                </Text>
              )}
            </>
          ))}
          )
        </Text>
      );
    } catch (e) {
      return (
        <Text className={classes.itemActionCallFailed} color="red">
          无法渲染此节点：{(e as any).toString()}
        </Text>
      );
    }
  };

  return (
    <Shell>
      <Container my={60}>
        <Title order={1}>{parentId} 的消息</Title>
        <Divider mt={10} mb={30} />
        <Skeleton visible={isFetching} height="100%" mih={400} radius="md">
          <Paper
            className={classes.main}
            withBorder
            component={ScrollArea}
            onScrollPositionChange={onScrollPositionChange}
            viewportRef={viewport}
            mih={400}
            h="calc(100vh - 320px)"
          >
            {isFetchingMore && (
              <Center>
                <Loader variant="dots" my="lg" />
              </Center>
            )}
            {!hasMore && (
              <Center my={10}>
                <Text color="dimmed" size="sm">
                  没有更多了
                </Text>
              </Center>
            )}
            {messages.map((message) => {
              return (
                <Box className={classes.item} key={message.id}>
                  <Group spacing={5}>
                    <Text className={classes.itemTimestamp} color="dimmed">
                      [{DateTime.fromISO(message.timestamp).toFormat('yyyy/LL/dd HH:mm:ss')}]
                    </Text>
                    <Badge
                      variant="light"
                      size="xs"
                      color={
                        message.role === 'user'
                          ? 'blue'
                          : message.role === 'system'
                          ? 'orange'
                          : message.role === 'assistant'
                          ? 'green'
                          : 'yellow'
                      }
                    >
                      {message.role}
                    </Badge>
                    {message.action && <ActionMessage message={message} />}
                    {message.content && (
                      <Text className={classes.itemContent}>
                        {message.sender && (
                          <Text color="dimmed" span className={classes.itemContent}>
                            {message.sender.id}
                            {message.sender.name && `(${message.sender.name})`}:{' '}
                          </Text>
                        )}
                        {message.content}
                      </Text>
                    )}
                  </Group>
                </Box>
              );
            })}
          </Paper>
          <Affix position={{ bottom: rem(65), right: rem(20) }}>
            <Transition transition="slide-up" mounted={unreadMessages.current > 0}>
              {(transitionStyles) => (
                <Button
                  leftIcon={<IconArrowDown size="1rem" />}
                  className={classes.unreadButton}
                  style={transitionStyles}
                  onClick={() =>
                    viewport.current!.scrollTo({
                      top: viewport.current!.scrollHeight,
                      behavior: 'smooth',
                    })
                  }
                >
                  {unreadMessages.current} 条未读消息
                </Button>
              )}
            </Transition>
          </Affix>
        </Skeleton>
      </Container>
    </Shell>
  );
}
