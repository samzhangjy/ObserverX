import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { type EntitySchema } from 'typeorm/entity-schema/EntitySchema';

let currentDataSource: DataSource | null = null;

export type Entity = Function | string | EntitySchema;

export const entities: Entity[] = [];

function createDataSource() {
  return new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT, 10),
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    synchronize: true,
    logging: false,
    entities,
    subscribers: [],
    migrations: [],
  });
}

function getDataSource() {
  if (!currentDataSource) {
    currentDataSource = createDataSource();
  }
  return currentDataSource;
}

export function addEntities(...toAdd: Entity[]) {
  toAdd.forEach((entity) => entities.push(entity));
  if (currentDataSource) currentDataSource = createDataSource();
}

export default getDataSource;
