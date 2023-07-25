# `@observerx/core`

ObserverX bot core.

## Installation

```bash
$ npm install @observerx/core
```

## Usage

```js
import ObserverX from '@observerx/core';

const bot = new ObserverX();

const stream = await bot.chat('Hello, world!');
// stream is a generator
for await (const part of stream) {
  console.log(part);
}
```

Or if you want to have an interactive session with the bot in the console:

```js
import { chat } from '@observerx/core';

chat();
```

However, this feature might be removed from `@observerx/core` in the future and move it into a separate package.
