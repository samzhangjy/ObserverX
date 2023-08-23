import { defineConfig } from 'vitepress';

export default defineConfig({
  description: '你的AI伙伴。',
  themeConfig: {
    nav: [
      { text: '首页', link: '/zh/' },
      { text: '指南', link: '/zh/guide/' },
      { text: 'API 参考', link: '/zh/api-reference/' },
    ],

    sidebar: [
      {
        text: '介绍',
        items: [
          { text: '什么是ObserverX？', link: '/zh/guide/' },
          { text: '快速开始', link: '/zh/guide/getting-started' },
        ],
      },
      {
        text: '平台',
        items: [
          { text: '命令行', link: '/zh/platforms/console' },
        ],
      },
    ],
  },
});
