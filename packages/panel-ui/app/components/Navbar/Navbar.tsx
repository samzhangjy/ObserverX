import { useState } from 'react';
import { Code, Group, MediaQuery, Navbar as BaseNavbar, Title, useMantineTheme } from '@mantine/core';
import useStyles from './styles';
import { IconBrandQq, IconLogout, IconServer } from '@tabler/icons-react';
import { Link } from '@remix-run/react';
import { useMediaQuery } from '@mantine/hooks';


const data = [
  { link: '/', label: '服务器', icon: IconServer },
  { link: '/qq', label: 'QQ', icon: IconBrandQq },
];

export function Navbar({ hiddenBreakpoint, hidden }: { hiddenBreakpoint?: string; hidden?: boolean }) {
  const { classes, cx } = useStyles();
  const [active, setActive] = useState('Billing');
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

  const links = data.map((item) => (
    <Link
      className={cx(classes.link, { [classes.linkActive]: item.label === active })}
      to={item.link}
      key={item.label}
      onClick={(event) => {
        setActive(item.label);
      }}
    >
      <item.icon className={classes.linkIcon} stroke={1.5} />
      <span>{item.label}</span>
    </Link>
  ));

  return (
    <BaseNavbar height={isMobile ? 'calc(100% - 40px)' : '100%'} width={{ sm: 200, lg: 300 }} p='md'
                hiddenBreakpoint={hiddenBreakpoint} hidden={hidden}>
      <BaseNavbar.Section grow>
        <MediaQuery smallerThan='sm' styles={{ display: 'none' }}>
          <Group className={classes.header} position='apart'>
            <Title size={20}>ObserverX</Title>
            <Code sx={{ fontWeight: 700 }}>v3.1.2</Code>
          </Group>
        </MediaQuery>
        {links}
      </BaseNavbar.Section>

      <BaseNavbar.Section className={classes.footer}>
        <Link to='#' className={classes.link} onClick={(event) => event.preventDefault()}>
          <IconLogout className={classes.linkIcon} stroke={1.5} />
          <span>退出登录</span>
        </Link>
      </BaseNavbar.Section>
    </BaseNavbar>
  );
}
