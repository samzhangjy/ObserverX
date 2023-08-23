---
title: 快速开始
editLink: true
---

# 快速开始

## 安装

### 前置条件

- [Node.js](https://nodejs.org/en/) 版本 19 或更高。
- 命令行终端。

ObserverX 被认为是一个聊天机器人框架，因此建议你对机器人开发有基本的了解。

在你的项目目录中，运行以下命令来安装 ObserverX：

::: code-group

```shell [npm]
$ npm install @observerx/core @observerx/console @observerx/database typeorm
```

```shell [pnpm]
$ pnpm add @observerx/core @observerx/console @observerx/database typeorm
```
:::

:::details 为什么是 TypeORM？
[TypeORM](https://typeorm.io) 是一个优秀的 Node.js 数据库 ORM 库。

ObserverX 使用 Postgres 作为默认数据库来存储聊天记录和用户信息，使用 TypeORM。受限于整体架构，ObserverX 目前需要使用 TypeORM 而不是
其他 ORM。

ObserverX 未来可能会支持其他数据库 / ORM。
:::

::: tip
在下面的示例中，我们将创建一个简单的命令行界面来与机器人聊天。因此，我们需要安装 `@observerx/console` 包。

但是，如果你想集成 ObserverX 到你的项目中，可以不安装它。
:::

## 示例：创建一个 CLI

ObserverX 原生地提供了一个命令行界面（CLI）平台，用于测试和调试，可以通过 `@observerx/console` 安装。

:::info
**平台**是与机器人交互的方式。例如，CLI 平台允许你在终端中与机器人聊天。还有其他平台，例如 HTTP 服务器平台（`@observerx/server`）、QQ 平台（`@observerx/qq`）。

平台可以通过连接到目标平台的 API 来轻松构建。ObserverX 对深度定制和扩展有着丰富的支持。
:::

在你安装 ObserverX 的项目目录中，创建一个名为 `cli.js` 的文件，内容如下：

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
请确保你在 `package.json` 中设置了 `"type": "module"` ，以便在文件顶层可以使用 `async/await`
语法。
:::

<!-- translate the below content to chinese -->

接下来，在 `.env` 文件中配置你的 OpenAI 密钥：

```properties
OPENAI_API_KEY=sk-...
```

:::details 更改 OpenAI API URL
默认情况下，ObserverX 使用 `https://api.openai.com/v1/` 的 OpenAI API。如果你想要更改它，
只需在 `.env` 文件中添加以下配置：

```properties
OPENAI_API_BASE_URL=<your-api-url>
```
:::

最后，在终端中运行 `cli.js`：

```shell
$ node cli.js
```

如果一切顺利进行，你应该可以与 GPT-3.5 聊天了。

### 发生了什么？

让我们来看看我们刚刚写的代码。首先，我们将数据库实体添加到数据库中：

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

`addEntities` 是一个单例函数，它会自动将数据库实体添加到数据库中。它**总是**应该在 `getDataSource` 之前被调用。

`getDataSource` 会在当前不存在 [`DataSource`](https://typeorm.io/data-source#what-is-datasource) 的情况下，创建一个新的 
`DataSource` 对象，否则返回当前存在的对象。

然后，我们通过 [`dataSource.initialize()`](https://typeorm.io/data-source-api) 初始化数据源。**在调用任何 ObserverX 核心相关
的函数之前，必须初始化数据源。**

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

这些代码首先从给定的数据源创建一个新的 [`PlatformConsole`](/platforms/console) 对象，然后使用给定的参数启动控制台平台。每个平台都
有自己的一组参数，所以请确保检查你正在使用的平台的文档。
