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
  Checkbox,
  Container,
  Divider,
  Modal,
  Paper,
  ScrollArea,
  Text,
  TextInput,
  Title,
  useMantineTheme,
} from '@mantine/core';
import { useMediaQuery, useDebouncedValue, usePrevious } from '@mantine/hooks';
import type { DataTableSortStatus } from 'mantine-datatable';
import { DataTable } from 'mantine-datatable';
import { useForm } from '@mantine/form';
import { IconCheck, IconCross, IconSearch, IconX } from '@tabler/icons-react';

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

interface User {
  id: string;
  name: string;
  hobbies?: string;
  personality?: string;
  isAdmin: boolean;
}

export default function Users() {
  const navigate = useNavigate();
  const { serverUrl } = useLoaderData<typeof loader>();
  const [users, setUsers] = useState<User[]>([]);
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);
  const [currentlyEditing, setCurrentlyEditing] = useState<User>();
  const [totalUsers, setTotalUsers] = useState(0);
  const [usersPerPage, setUsersPerPage] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFetching, setIsFetching] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
    columnAccessor: 'id',
    direction: 'asc',
  });
  const [userIdQuery, setUserIdQuery] = useState('');
  const [nameQuery, setNameQuery] = useState('');
  const [hobbiesQuery, setHobbiesQuery] = useState('');
  const [personalityQuery, setPersonalityQuery] = useState('');
  const [isAdminQuery, setIsAdminQuery] = useState<boolean | null>(null);
  const [isAdminQueryCheckboxIndeterminate, setIsAdminQueryCheckboxIndeterminate] = useState(false);
  const prevIsAdminQuery = usePrevious(isAdminQuery);
  const [userIdDebounced] = useDebouncedValue(userIdQuery, 500);
  const [nameDebounced] = useDebouncedValue(nameQuery, 500);
  const [hobbiesDebounced] = useDebouncedValue(hobbiesQuery, 500);
  const [personalityDebounced] = useDebouncedValue(personalityQuery, 500);
  const form = useForm({
    initialValues: {
      name: '',
      hobbies: '',
      personality: '',
      isAdmin: false,
    },
  });

  const getUsers = async (page = 1) => {
    setIsFetching(true);
    let url = `${serverUrl}/users?page=${page}`;
    if (sortStatus.columnAccessor) {
      url += `&sortBy=${sortStatus.columnAccessor}&order=${sortStatus.direction}`;
    }
    if (nameDebounced) {
      url += `&name=${nameQuery}`;
    }
    if (userIdDebounced) {
      url += `&userId=${userIdQuery}`;
    }
    if (hobbiesDebounced) {
      url += `&hobbies=${hobbiesQuery}`;
    }
    if (personalityDebounced) {
      url += `&personality=${personalityQuery}`;
    }
    if (isAdminQuery !== null) {
      url += `&isAdmin=${isAdminQuery}`;
    }
    const response = await fetch(url, {
      headers: {
        Authorization: getAuth(),
      },
    });
    const data = await response.json();

    setUsers(data.users);
    setTotalUsers(data.total);
    setUsersPerPage(parseInt(data.perPage, 10));
    setIsFetching(false);
  };

  const setUser = async (id: string, user: Partial<User>) => {
    await fetch(`${serverUrl}/users/${id}`, {
      headers: {
        Authorization: getAuth(),
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify({
        user,
      }),
    });
    await getUsers(currentPage);
  };

  useEffect(() => {
    const checker = async () => {
      const loggedIn = await isLoggedIn(serverUrl);
      if (!loggedIn) {
        navigate('/login');
      }
    };
    checker().then(() => {
      getUsers();
    });
  }, []);

  useEffect(() => {
    getUsers();
  }, [
    sortStatus,
    nameDebounced,
    userIdDebounced,
    hobbiesDebounced,
    personalityDebounced,
    isAdminQuery,
  ]);

  useEffect(() => {
    if (prevIsAdminQuery) {
      setIsAdminQueryCheckboxIndeterminate(true);
    } else if (prevIsAdminQuery === false) {
      setIsAdminQueryCheckboxIndeterminate(false);
    }
  }, [isAdminQuery]);

  return (
    <Shell>
      <Container>
        <Title order={1}>用户</Title>
        <Divider mt={10} mb={30} />
        <Text mb={20}>共计 {totalUsers} 个用户。</Text>
        <Paper p="lg" shadow="sm" radius="md">
          <DataTable
            maw="100%"
            columns={[
              {
                accessor: 'id',
                title: 'ID',
                render: (user) => user.id,
                sortable: true,
                filter: (
                  <TextInput
                    label="用户 ID"
                    description="查找 ID 中包含指定内容的用户"
                    placeholder="查找用户……"
                    icon={<IconSearch size={16} />}
                    value={userIdQuery}
                    onChange={(e) => setUserIdQuery(e.currentTarget.value)}
                  />
                ),
                filtering: userIdQuery !== '',
              },
              {
                accessor: 'name',
                title: '昵称',
                render: (user) => (!user.name ? <Text color="dimmed">N/A</Text> : user.name),
                sortable: true,
                filter: (
                  <TextInput
                    label="用户昵称"
                    description="查找昵称中包含指定内容的用户"
                    placeholder="查找用户……"
                    icon={<IconSearch size={16} />}
                    value={nameQuery}
                    onChange={(e) => setNameQuery(e.currentTarget.value)}
                  />
                ),
                filtering: nameQuery !== '',
              },
              {
                accessor: 'personality',
                title: '性格',
                render: (user) =>
                  !user.personality ? <Text color="dimmed">N/A</Text> : user.personality,
                sortable: false,
                filter: (
                  <TextInput
                    label="用户性格"
                    description="查找性格中包含指定内容的用户"
                    placeholder="查找用户……"
                    icon={<IconSearch size={16} />}
                    value={personalityQuery}
                    onChange={(e) => setPersonalityQuery(e.currentTarget.value)}
                  />
                ),
                filtering: personalityQuery !== '',
              },
              {
                accessor: 'hobbies',
                title: '爱好',
                render: (user) => (!user.hobbies ? <Text color="dimmed">N/A</Text> : user.hobbies),
                sortable: false,
                filter: (
                  <TextInput
                    label="用户爱好"
                    description="查找爱好中包含指定内容的用户"
                    placeholder="查找用户……"
                    icon={<IconSearch size={16} />}
                    value={hobbiesQuery}
                    onChange={(e) => setHobbiesQuery(e.currentTarget.value)}
                  />
                ),
                filtering: hobbiesQuery !== '',
              },
              {
                accessor: 'isAdmin',
                title: '管理员',
                render: (user) => (!user.isAdmin ? '否' : '是'),
                sortable: false,
                filter: (
                  <Checkbox
                    label="管理员"
                    description="查找管理员用户"
                    placeholder="查找用户……"
                    icon={({ indeterminate, className }) =>
                      indeterminate ? (
                        <IconX className={className} />
                      ) : (
                        <IconCheck className={className} />
                      )
                    }
                    checked={isAdminQuery !== null}
                    indeterminate={isAdminQueryCheckboxIndeterminate}
                    onChange={(e) =>
                      setIsAdminQuery(
                        isAdminQueryCheckboxIndeterminate ? null : e.currentTarget.checked,
                      )
                    }
                  />
                ),
                filtering: isAdminQuery !== null,
              },
            ]}
            records={users}
            onRowClick={(user) => {
              form.setValues({
                name: user.name ?? '',
                hobbies: user.hobbies ?? '',
                personality: user.personality ?? '',
                isAdmin: user.isAdmin ?? false,
              });
              setCurrentlyEditing(user);
              setIsEditing(true);
            }}
            totalRecords={totalUsers}
            page={currentPage}
            onPageChange={(page) => {
              setCurrentPage(page);
              getUsers(page);
            }}
            sortStatus={sortStatus}
            onSortStatusChange={setSortStatus}
            recordsPerPage={usersPerPage}
            fetching={isFetching}
            highlightOnHover
          />
        </Paper>
        <Modal
          opened={isEditing}
          onClose={() => setIsEditing(false)}
          title={`修改用户 ${currentlyEditing?.id}`}
        >
          <form
            onSubmit={form.onSubmit((value) => {
              setUser(currentlyEditing?.id as string, value);
              setIsEditing(false);
            })}
          >
            <TextInput label="名称" {...form.getInputProps('name')} />
            <TextInput label="性格" {...form.getInputProps('personality')} mt={10} />
            <TextInput label="爱好" {...form.getInputProps('hobbies')} mt={10} />
            <Checkbox
              label="管理员"
              {...form.getInputProps('isAdmin', { type: 'checkbox' })}
              mt={10}
            />
            <Button type="submit" mt={20} fullWidth variant="light">
              修改
            </Button>
          </form>
        </Modal>
      </Container>
    </Shell>
  );
}
