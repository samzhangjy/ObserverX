import { defineConfig } from 'vitepress';

export default defineConfig({
  description: "Your AI mate.",
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/' },
      { text: 'API Reference', link: '/api-reference/' },
    ],

    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'What is ObserverX?', link: '/guide/' },
          { text: 'Getting Started', link: '/guide/getting-started' },
        ],
      },
      {
        text: 'Platforms',
        items: [
          { text: 'Console', link: '/platforms/console' },
        ],
      },
    ],
  },
});
