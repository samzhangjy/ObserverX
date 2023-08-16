import { useForm } from '@mantine/form';
import type { PaperProps } from '@mantine/core';
import {
  Button,
  Container,
  Group,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { json } from '@remix-run/node';
import { notifications } from '@mantine/notifications';
import { useLoaderData, useNavigate } from '@remix-run/react';
import Cookies from 'js-cookie';

export function loader() {
  return json({ serverUrl: process.env.SERVER_URL ?? 'http://localhost:8000' });
}

export default function Login(props: PaperProps) {
  const form = useForm({
    initialValues: {
      username: '',
      password: '',
    },
  });
  const { serverUrl } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const login = async () => {
    const response = await fetch(`${serverUrl}/environment`, {
      headers: {
        Authorization: 'Basic ' + btoa(form.values.username + ':' + form.values.password),
      },
    });
    if (response.status !== 200) {
      notifications.show({
        message: '登录失败',
        color: 'red',
      });
      return;
    }
    Cookies.set('username', form.values.username);
    Cookies.set('password', form.values.password);
    notifications.show({
      message: '欢迎回来',
      color: 'green',
    });
    navigate('/');
  };

  return (
    <Container w={500} mt={100}>
      <Paper radius="md" p="xl" withBorder {...props}>
        <Text size="lg" weight={500} mb={10}>
          登入管理员账户
        </Text>

        <form onSubmit={form.onSubmit(login)}>
          <Stack>
            <TextInput
              required
              label="用户名"
              value={form.values.username}
              onChange={(event) => form.setFieldValue('username', event.currentTarget.value)}
              radius="md"
            />

            <PasswordInput
              required
              label="密码"
              value={form.values.password}
              onChange={(event) => form.setFieldValue('password', event.currentTarget.value)}
              radius="md"
            />
          </Stack>

          <Group position="apart" mt="xl">
            <Button type="submit" radius="xl">
              登录
            </Button>
          </Group>
        </form>
      </Paper>
    </Container>
  );
}
