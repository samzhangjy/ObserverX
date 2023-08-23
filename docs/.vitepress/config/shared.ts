import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "ObserverX",
  themeConfig: {
    socialLinks: [
      { icon: 'github', link: 'https://github.com/samzhangjy/ObserverX' }
    ],
    logo: './assets/logo.svg',
  },
  head: [['link', { rel: 'icon', href: '/favicon.ico' }]],
  locales: {
    root: {
      label: 'English',
      lang: 'en'
    },
    zh: {
      label: '简体中文',
      lang: 'zh-CN',
    }
  },
  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark',
    },
  },
})
