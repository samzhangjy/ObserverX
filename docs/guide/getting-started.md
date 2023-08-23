---
title: Getting Started
editLink: true
---

# Getting Started

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/en/) version 19 or higher.
- Terminal for accessing the command-line interface (CLI).

ObserverX is considered as a chatbot framework, so it is recommended to have a basic 
understanding of bot development.

In your project directory, run the following command to install ObserverX:

::: code-group

```shell [npm]
$ npm install @observerx/core @observerx/console @observerx/database typeorm
```

```shell [pnpm]
$ pnpm add @observerx/core @observerx/console @observerx/database typeorm
```

:::details Why TypeORM?
[TypeORM](https://typeorm.io) is an excellent database ORM library for Node.js.

ObserverX uses Postgres as the default database to store chat history and user information
with TypeORM. It is currently required to use TypeORM instead of other ORMs.

ObserverX may support other databases / ORMs in the future.
:::

::: tip
In the following example, we are going to create a simple command-line interface to chat
with the bot. Therefore, we need to install the `@observerx/console` package.

However, if you want to integrate ObserverX into your project instead, feel free not to install it.
:::

## Example: Creating a CLI

ObserverX natively ships a command-line interface (CLI) platform for testing and debugging purposes,
and can be installed through `@observerx/console`.

:::info
A **platform** is a way to interact with the bot. For example, a CLI platform allows you to chat with
the bot in the terminal. There are other platforms such as the HTTP server platform (`@observerx/server`),
the QQ platform (`@observerx/qq`).

Platforms can be easily built by connecting to target platform's API. ObserverX has rich support for deep
customization and extension.
:::

In the project directory you have installed ObserverX, create a file called `cli.js` with the following content:

```js
import PlatformConsole from '@observerx/console';
import { addEntities, getDataSource } from '@observerx/database';
import ObserverX from '@observerx/core';

addEntities(...ObserverX.getDatabaseEntities());
const dataSource = getDataSource();

await dataSource.initialize();

const platform = new PlatformConsole(dataSource);

platform.start({
  model: 'GPT-3.5',
  parentId: 'CONSOLE',
  prompt: 'default',
});
```

:::tip
Make sure you have `"type": "module"` set in your `package.json` to enable the use of `await`
at the top level.
:::

Then, configure your OpenAI credentials in the `.env` file:

```properties
OPENAI_API_KEY=sk-...
```

:::details Configuring API base URL
By default, ObserverX uses the OpenAI API at `https://api.openai.com/v1/`. If you want to
change it, simply add the following line to your `.env` file:

```properties
OPENAI_API_BASE_URL=<your-api-url>
```
:::

Finally, run `cli.js` in your terminal:

```shell
$ node cli.js
```

If everything went right, you should be able to chat with GPT-3.5 now.

### What's going on?

Let's take a look at the code we just wrote. First, we add the database entities to the database:

```js
import PlatformConsole from '@observerx/console';
import { addEntities, getDataSource } from '@observerx/database';
import ObserverX from '@observerx/core';

addEntities(...ObserverX.getDatabaseEntities()); // [!code focus:4]
const dataSource = getDataSource();

await dataSource.initialize();

const platform = new PlatformConsole(dataSource);

platform.start({
  model: 'GPT-3.5',
  parentId: 'CONSOLE',
  prompt: 'default',
});
```

`addEntities` is a singleton function that automatically adds the database entities to the database. It
should **always** be called before `getDataSource`.

`getDataSource` is a helper function that creates a new [`DataSource`](https://typeorm.io/data-source#what-is-datasource) object if none currently exists, or
else it returns the currently existing one.

Then, we initialize the data source by [`dataSource.initialize()`](https://typeorm.io/data-source-api). **It is
required to initialize the data source before calling any ObserverX core-related functions.**

```js
import PlatformConsole from '@observerx/console';
import { addEntities, getDataSource } from '@observerx/database';
import ObserverX from '@observerx/core';

addEntities(...ObserverX.getDatabaseEntities());
const dataSource = getDataSource();

await dataSource.initialize();

const platform = new PlatformConsole(dataSource);  // [!code focus:7]

platform.start({
  model: 'GPT-3.5',
  parentId: 'CONSOLE',
  prompt: 'default',
});
```

<!-- TODO: add more detailed description of platforms -->

The code first creates a new [`PlatformConsole`](/platforms/console) object from the given
data source and then starts the console platform with given parameters. Each 
platform has its own set of parameters, so make sure to check the documentation
of the platform you are using.
