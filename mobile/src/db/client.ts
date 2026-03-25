import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrate';
import { bootstrapDemoData } from './bootstrap';

let database: SQLite.SQLiteDatabase | null = null;
let initialized = false;

export async function getDb() {
  if (!database) {
    database = await SQLite.openDatabaseAsync('akpos.db');
  }
  if (!initialized) {
    await runMigrations(database);
    await bootstrapDemoData(database);
    initialized = true;
  }
  return database;
}
