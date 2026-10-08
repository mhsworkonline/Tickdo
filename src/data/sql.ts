/**
 * Minimal async SQL interface. Implemented by expo-sqlite in the app and by sql.js in tests,
 * so repositories and migrations are tested against real SQLite.
 */
export type SqlValue = string | number | null;

export interface SqlDb {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: readonly SqlValue[]): Promise<{ changes: number }>;
  getAllAsync<T>(sql: string, params?: readonly SqlValue[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: readonly SqlValue[]): Promise<T | null>;
  /** Runs `fn` in a transaction; rolls back if it throws. */
  transaction(fn: () => Promise<void>): Promise<void>;
}
