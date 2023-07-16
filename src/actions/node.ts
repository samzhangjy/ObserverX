import { exec as originalExec } from 'node:child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as util from 'util';
import Action from './action.js';

const exec = util.promisify(originalExec);

export interface RunNodeCodeParameters {
  code: string;
}

export async function runNodeCode({ code }: RunNodeCodeParameters) {
  const cacheDir = path.resolve('./cache');
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir);
  }

  const codePath = path.join(cacheDir, `${Date()}.cjs`);
  fs.writeFileSync(codePath, code, { encoding: 'utf-8' });

  try {
    const { stdout, stderr } = await exec(`node "${codePath}"`);
    return { stdout, stderr };
  } catch (e) {
    return { stdout: '', stderr: e.toString() };
  }
}

const runNodeCodeAction = new Action(
  {
    name: 'run_node_code',
    description:
      'Run Node.js code on the server in the form on commonjs. You must use `console.log()` to log your execution results to stdout. ' +
      'Otherwise you will not get the correct result. Also always add `.toString()` to your variable to be logged, especially for objects.\n' +
      'You have full access to the filesystem and the server, so you can do anything the user asked you to.' +
      'Including running shell scripts and doing things on the server with Nodejs.\nEach of your code is independent ' +
      'from each other, so every time you call this action a new sandbox is created. Do not rely on the previous code context.',
    parameters: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description:
            'The code to execute on the server, using JavaScript. Your code should be escaped in ECMAScript ' +
            'PrimaryExpression syntax, or otherwise it cannot be decoded correctly. When using escapes for JS code itself, ' +
            'e.g. inside a string, you should use double backslash to make it a real backslash in the code. For instance, ' +
            "\"const a = 'abc'cd'\" should be encoded into \"const a = \\'abc\\\\'cd\\'\".",
        },
      },
      required: ['code'],
    },
  },
  runNodeCode,
);

export default runNodeCodeAction;
