import { migration001 } from './001_init';

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
];
