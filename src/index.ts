import * as readline from 'readline';
import * as process from 'process';
import chalk from 'chalk';
import Bot from './connector.js';

const bot = new Bot('default', 'GPT-3.5');

const reader = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

readline.emitKeypressEvents(process.stdin);

const ask = async (userInput: string) => {
  if (!userInput) return;

  const stream = await bot.chat(userInput);

  const cancelListener = async (ch, key) => {
    if (key && key.name === 'c') {
      if (typeof stream === 'string') return;
      await stream.return();
      process.stdout.write(chalk.red('\nCanceled.\n'));
    }
  };

  process.stdin.on('keypress', cancelListener);

  process.stdin.setRawMode(true);

  for await (const segment of stream) {
    if (typeof segment === 'string') {
      console.log(chalk.bold.red(segment));
    } else if (segment.type === 'message-start') {
      process.stdout.write(chalk.bold.blue('ObserverX: '));
    } else if (segment.type === 'message-part') {
      process.stdout.write(segment.content);
    } else if (segment.type === 'message-end') {
      process.stdout.write('\n');
    } else if (segment.type === 'action') {
      process.stdout.write(
        `${chalk.gray('Using tool: ')}${chalk.italic(segment.actionName)}(${Object.entries(
          segment.actionArgs,
        )
          .map(([key, value]) => `${key}=${chalk.green(value.toString())}`)
          .join(', ')})${chalk.gray('... ')}`,
      );
    } else if (segment.type === 'action-result') {
      process.stdout.write(chalk.gray('done.\n'));
    }
  }

  process.stdin.removeListener('keypress', cancelListener);

  reader.question(chalk.bold('You: '), ask);
};

reader.question(chalk.bold('You: '), ask);
