import { useState } from 'react';
import {
  Code,
  Group,
  MediaQuery,
  Navbar as BaseNavbar,
  Title,
  useMantineTheme,
} from '@mantine/core';
import useStyles from './styles';
import { IconBrandQq, IconServer } from '@tabler/icons-react';
import { Link, useLocation } from '@remix-run/react';
import { useMediaQuery } from '@mantine/hooks';
import { version } from '../../../package.json';

const data = [
  { link: '/', label: '服务器', icon: IconServer },
  { link: '/qq', label: 'QQ', icon: IconBrandQq },
];

export function Navbar({
  hiddenBreakpoint,
  hidden,
}: {
  hiddenBreakpoint?: string;
  hidden?: boolean;
}) {
  const { classes, cx } = useStyles();
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);
  const location = useLocation();

  const links = data.map((item) => (
    <Link
      className={cx(classes.link, { [classes.linkActive]: item.link === location.pathname })}
      to={item.link}
      key={item.label}
    >
      <item.icon className={classes.linkIcon} stroke={1.5} />
      <span>{item.label}</span>
    </Link>
  ));

  return (
    <BaseNavbar
      height={isMobile ? 'calc(100% - 40px)' : '100%'}
      width={{ sm: 200, lg: 300 }}
      p="md"
      hiddenBreakpoint={hiddenBreakpoint}
      hidden={hidden}
    >
      <BaseNavbar.Section grow>
        <MediaQuery smallerThan="sm" styles={{ display: 'none' }}>
          <Group className={classes.header} position="apart">
            <Title size={20}>ObserverX</Title>
            <Code sx={{ fontWeight: 700 }}>v{version}</Code>
          </Group>
        </MediaQuery>
        {links}
      </BaseNavbar.Section>
    </BaseNavbar>
  );
}
