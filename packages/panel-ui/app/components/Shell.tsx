import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  AppShell,
  Box,
  Burger,
  Code,
  Footer,
  Group,
  Header,
  MediaQuery,
  ScrollArea,
  Text,
  Title,
  useMantineTheme,
} from '@mantine/core';
import { Navbar } from './Navbar';
import { useMediaQuery } from '@mantine/hooks';
import { version } from '../../package.json';

export default function Shell({ children }: { children: ReactNode }) {
  const [opened, setOpened] = useState(false);
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);
  const mainContentPadding = 16;

  return (
    <AppShell
      layout={isMobile ? 'default' : 'alt'}
      styles={{
        main: {
          background: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[0],
          paddingTop: isMobile ? 'var(--mantine-header-height, 0px)' : '0px', // remove padding from mantine main component
          paddingBottom: '0px',
          paddingLeft: 'var(--mantine-navbar-width, 0px)',
          paddingRight: 'var(--mantine-aside-width, 0px)',
        },
      }}
      navbarOffsetBreakpoint="sm"
      asideOffsetBreakpoint="sm"
      navbar={<Navbar hiddenBreakpoint="sm" hidden={!opened} />}
      footer={
        !opened && !isMobile ? (
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
            <Group position="apart">
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
              <Code sx={{ fontWeight: 700 }}>v{version}</Code>
            </Group>
          </Header>
        </MediaQuery>
      }
    >
      <ScrollArea
        sx={{
          height: 'calc(100vh - var(--mantine-header-height, 0px))',
          width: `calc(100vw - ${
            2 * mainContentPadding
          }px - var(--mantine-aside-width, 0px) - var(--mantine-navbar-width, 0px))`,
        }}
      >
        <Box
          p={mainContentPadding}
          sx={{
            minWidth: `calc(100vw - ${
              2 * mainContentPadding
            }px - var(--mantine-aside-width, 0px) - var(--mantine-navbar-width, 0px))`,
            minHeight: `calc(100vh - ${
              2 * mainContentPadding
            }px - var(--mantine-header-height, 0px))`,
          }}
        >
          {children}
        </Box>
      </ScrollArea>
    </AppShell>
  );
}
