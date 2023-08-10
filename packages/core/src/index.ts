import * as readline from 'readline';
import * as process from 'process';
import chalk from 'chalk';
import ObserverX from './connector.js';

// NOTE: consider moving the below function into a separate package,
//       e.g. @observerx/cli, and then importing it here.
export function chat(...params: ConstructorParameters<typeof ObserverX>) {
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
      }
    }

    process.stdin.removeListener('keypress', cancelListener);

    reader.question(chalk.bold('You: '), ask);
  };

  reader.question(chalk.bold('You: '), ask);
}

export { default, type ChatResult, type IChat } from './connector.js';
export { default as getMessages } from './messages.js';
export { addAction } from './actions/index.js';
export {
  default as Action,
  type ActionInvoker,
  type ActionParameters,
  type ActionProperties,
  type ActionConfig,
  type ActionDoc,
  type ActionBaseStatus,
  type ChangeActionConfig,
} from './actions/action.js';
