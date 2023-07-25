import 'reflect-metadata';
import ObserverXServer from './application.js';

const app = new ObserverXServer();

app.start();

export { default } from './application.js';
