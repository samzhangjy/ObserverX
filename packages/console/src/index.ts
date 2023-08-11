import readline from 'readline';
import process from 'process';
import ObserverX from '@observerx/core';
import chalk from 'chalk';
import { addEntities, getDataSource } from '@observerx/database';

export function chatWithParams(...params: ConstructorParameters<typeof ObserverX>) {
  const bot = new ObserverX(...params);

  const reader = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  readline.emitKeypressEvents(process.stdin);

  process.stdin.setRawMode(true);

  const ask = async (userInput: string) => {
    if (!userInput) return;

    const stream = await bot.chat({
      message: userInput,
      senderId: '1',
    });

    // TODO: remove the `c` character from console input (stdin stream)
    const cancelListener = async (ch, key) => {
      if (key && key.name === 'c') {
        if (typeof stream === 'string') return;
        await stream.return();
        process.stdout.write(chalk.red('\nCanceled.\n'));
      }
    };

    process.stdin.on('keypress', cancelListener);

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
        process.stdout.write(`${chalk.gray('Action result: ')}${JSON.stringify(segment.result)}\n`);
      }
    }

    process.stdin.removeListener('keypress', cancelListener);

    reader.question(chalk.bold('You: '), ask);
  };

  reader.question(chalk.bold('You: '), ask);
}

async function chat() {
  addEntities(...ObserverX.getDatabaseEntities());
  const dataSource = getDataSource();
  await dataSource.initialize();
  chatWithParams({
    prompt: 'default',
    model: 'GPT-3.5',
    parentId: 'CONSOLE',
    dataSource,
  });
}

export default chat;
