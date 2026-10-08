import initSqlJs, { type Database } from 'sql.js';

import type { SqlDb, SqlValue } from '@/data/sql';

/** Real SQLite (compiled to WebAssembly) for Jest. */
export async function createTestDb(): Promise<SqlDb & { raw: Database }> {
  const SQL = await initSqlJs();
  const raw = new SQL.Database();
  let depth = 0;

  const all = <T>(sql: string, params: readonly SqlValue[] = []): T[] => {
    const stmt = raw.prepare(sql);
    try {
      stmt.bind(params as SqlValue[]);
      const rows: T[] = [];
      while (stmt.step()) rows.push(stmt.getAsObject() as T);
      return rows;
    } finally {
      stmt.free();
    }
  };

  return {
    raw,
    async execAsync(sql) {
      raw.exec(sql);
    },
    async runAsync(sql, params = []) {
      raw.run(sql, params as SqlValue[]);
      return { changes: raw.getRowsModified() };
    },
    async getAllAsync<T>(sql: string, params: readonly SqlValue[] = []) {
      return all<T>(sql, params);
    },
    async getFirstAsync<T>(sql: string, params: readonly SqlValue[] = []) {
      return all<T>(sql, params)[0] ?? null;
    },
    async transaction(fn) {
      const sp = `sp${depth++}`;
      raw.exec(`SAVEPOINT ${sp}`);
      try {
        await fn();
        raw.exec(`RELEASE ${sp}`);
      } catch (e) {
        raw.exec(`ROLLBACK TO ${sp}; RELEASE ${sp}`);
        throw e;
      } finally {
        depth--;
      }
    },
  };
}
