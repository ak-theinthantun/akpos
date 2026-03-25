import * as SQLite from 'expo-sqlite';

let database: SQLite.SQLiteDatabase | null = null;

export async function getDb() {
  if (!database) {
    database = await SQLite.openDatabaseAsync('akpos.db');
  }
  return database;
}
