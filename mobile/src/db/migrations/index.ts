import { migration001 } from './001_init';
import { migration002 } from './002_suppliers';

export interface Migration {
  id: number;
  name: string;
  sql: string;
}

export const migrations: Migration[] = [
  {
    id: 1,
    name: '001_init',
    sql: migration001,
  },
  {
    id: 2,
    name: '002_suppliers',
    sql: migration002,
  },
];
