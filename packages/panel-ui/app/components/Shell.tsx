import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  AppShell,
  Burger,
  Footer,
  Header,
  MediaQuery,
  Text,
  Title,
  useMantineTheme,
} from '@mantine/core';
import { Navbar } from './Navbar';
import { useMediaQuery } from '@mantine/hooks';

export default function Shell({ children }: { children: ReactNode }) {
  const [opened, setOpened] = useState(false);
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);
  return (
    <AppShell
      layout={isMobile ? 'default' : 'alt'}
      styles={{
        main: {
          background: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[0],
        },
      }}
      navbarOffsetBreakpoint="sm"
      asideOffsetBreakpoint="sm"
      navbar={<Navbar hiddenBreakpoint="sm" hidden={!opened} />}
      footer={
        !opened ? (
          <Footer height={60} p="md">
            <Text size="sm" color="dimmed">
              Copyright &copy; {new Date().getFullYear()} Sam Zhang.
            </Text>
          </Footer>
        ) : (
          <></>
        )
      }
      header={
        <MediaQuery largerThan="sm" styles={{ display: 'none' }}>
          <Header height={{ base: 50, md: 70 }} p="md">
            <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              <Burger
                opened={opened}
                onClick={() => setOpened((o) => !o)}
                size="sm"
                color={theme.colors.gray[6]}
                mr="xl"
              />
              <Title order={5}>ObserverX</Title>
            </div>
          </Header>
        </MediaQuery>
      }
    >
      {children}
    </AppShell>
  );
}
