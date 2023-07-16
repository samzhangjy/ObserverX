import 'reflect-metadata';
import { DataSource } from 'typeorm';
import path from 'path';
import { fileURLToPath } from 'url';

// eslint-disable-next-line @typescript-eslint/naming-convention,no-underscore-dangle
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'sam951796',
  database: 'observerx',
  synchronize: true,
  logging: true,
  entities: [path.join(__dirname, './entity/*.{js,ts}')],
  subscribers: [],
  migrations: [],
});

await dataSource.initialize();

export default dataSource;
