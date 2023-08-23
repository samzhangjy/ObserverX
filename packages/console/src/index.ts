import readline from 'readline';
import process from 'process';
import ObserverX, { Action, Middleware, Platform, Plugin } from '@observerx/core';
import chalk from 'chalk';
import { DataSource } from 'typeorm';

export interface IPlatformConsoleConfig {
  plugins?: (typeof Plugin)[];
  actions?: Action[];
  middlewares?: (typeof Middleware)[];
}

class PlatformConsole implements Platform {
  private readonly dataSource: DataSource;

  private shouldStop: boolean = false;

  public bot: ObserverX;

  private readonly plugins: (typeof Plugin)[];

  private readonly actions: Action[];

  private readonly middlewares: (typeof Middleware)[];

  constructor(
    dataSource: DataSource,
    { plugins, middlewares, actions }: IPlatformConsoleConfig = {},
  ) {
    this.dataSource = dataSource;
    if (!this.dataSource.isInitialized) {
      throw new Error('Data source not initialized.');
    }

    this.plugins = plugins;
    this.actions = actions;
    this.middlewares = middlewares;

    this.initialize();
  }

  public initialize() {
    this.bot = null;
  }

  public start(
    params: Omit<
      ConstructorParameters<typeof ObserverX>[0],
      'dataSource' | 'plugins' | 'actions' | 'middlewares'
    > = {},
  ) {
    this.bot = new ObserverX({
      ...params,
      dataSource: this.dataSource,
      plugins: this.plugins,
      actions: this.actions,
      middlewares: this.middlewares,
    });

    const reader = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    readline.emitKeypressEvents(process.stdin);

    process.stdin.setRawMode(true);

    const ask = async (userInput: string) => {
      if (!userInput || this.shouldStop) return;

      const stream = await this.bot.chat({
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
        if (segment.type === 'error') {
          process.stdout.write(
            `${chalk.gray('An unexpected error occurred:')}\n${chalk.bold.red(
              segment.error.name,
            )} (status=${chalk.blue(segment.error.status)}): ${chalk.bold(
              segment.error.message,
            )}\n${chalk.gray(JSON.stringify(segment.error.error, undefined, 2))}`,
          );
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
          process.stdout.write(
            `${chalk.gray('Action result: ')}${JSON.stringify(segment.result)}\n`,
          );
        } else if (segment.type === 'update-info') {
          process.stdout.write(chalk.gray('Updating user info...\n'));
        }
      }

      process.stdin.removeListener('keypress', cancelListener);

      reader.question(chalk.bold('You: '), ask);
    };

    reader.question(chalk.bold('You: '), ask);
  }

  public stop() {
    this.shouldStop = true;
  }
}

export default PlatformConsole;
