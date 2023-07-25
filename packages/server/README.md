# `@observerx/server`

HTTP server for ObserverX, based on Expressjs.

## Installation

```bash
$ npm install @observerx/server
```

## Usage

```js
import ObserverXServer from '@observerx/server';

const server = new ObserverXServer();
server.start();
// Server is listening on localhost:3000

// You can also set a port number and a host name
// server.start(3000, 'localhost');
```

> Note: Configurations of ObserverX core should be written in environment variables or a `.env` file.
