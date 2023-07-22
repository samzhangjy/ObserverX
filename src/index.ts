import * as readline from 'readline';
import Bot from './connector.js';

const bot = new Bot('default', 'GPT-4');

const reader = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = async (userInput: string) => {
  if (!userInput) return;
  for await (const segment of await bot.chat(userInput)) {
    console.log(segment);
  }
  reader.question('You: ', ask);
};

reader.question('You: ', ask);
