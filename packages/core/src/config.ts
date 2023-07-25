export const modelMap = {
  'GPT-3.5': {
    name: 'gpt-3.5-turbo',
    tokenLimit: 4096,
  },
  'GPT-4': {
    name: 'gpt-4',
    tokenLimit: 8192,
  },
} satisfies Record<string, { name: string; tokenLimit: number }>;

export type BotModel = keyof typeof modelMap;
