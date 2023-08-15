import type { V2_MetaFunction } from '@remix-run/node';
import { Links, LiveReload, Meta, Outlet, Scripts, ScrollRestoration } from '@remix-run/react';
import { createEmotionCache, MantineProvider } from '@mantine/core';
import { StylesPlaceholder } from '@mantine/remix';
import { useColorScheme } from '@mantine/hooks';
import { Notifications } from '@mantine/notifications';

export const meta: V2_MetaFunction = () => ([
  {
    title: 'ObserverX',
  },
  {
    name: 'viewport',
    content: 'width=device-width, initial-scale=1',
  },
]);

createEmotionCache({ key: 'mantine' });

export default function App() {
  const colorScheme = useColorScheme();
  return (
    <MantineProvider theme={{ colorScheme }} withGlobalStyles withNormalizeCSS>
      <html lang='en'>
      <head>
        <StylesPlaceholder />
        <Meta />
        <Links />
      </head>
      <body>
        <Notifications />
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
      </html>
    </MantineProvider>
  );
}
