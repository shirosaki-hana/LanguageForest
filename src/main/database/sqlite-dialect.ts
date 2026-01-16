/**
 * node:sqlite용 Kysely Dialect
 *
 * Node.js 22.5.0+ 내장 SQLite 모듈을 Kysely와 함께 사용하기 위한 커스텀 dialect.
 * Electron 환경에서 네이티브 모듈 없이 SQLite를 사용할 수 있습니다.
 */
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync, type StatementSync } from 'node:sqlite';

// SQLite가 지원하는 값 타입
type SqliteValue = string | number | bigint | Buffer | null;
import type {
  DatabaseConnection,
  DatabaseIntrospector,
  Dialect,
  DialectAdapter,
  Driver,
  Kysely,
  QueryCompiler,
  QueryResult,
  CompiledQuery,
  TransactionSettings,
} from 'kysely';
import { SqliteAdapter, SqliteIntrospector, SqliteQueryCompiler } from 'kysely';

//------------------------------------------------------------------------------
// Configuration
//------------------------------------------------------------------------------

export interface NodeSqliteDialectConfig {
  /**
   * SQLite 데이터베이스 파일 경로.
   * ':memory:'를 사용하면 인메모리 DB 생성.
   */
  database: string;

  /**
   * 연결 시 실행할 PRAGMA 설정들
   */
  pragmas?: Record<string, string | number | boolean>;
}

//------------------------------------------------------------------------------
// Connection
//------------------------------------------------------------------------------

class NodeSqliteConnection implements DatabaseConnection {
  readonly db: DatabaseSync;
  private statementCache: Map<string, StatementSync> = new Map();

  constructor(db: DatabaseSync) {
    this.db = db;
  }

  async executeQuery<R>(compiledQuery: CompiledQuery): Promise<QueryResult<R>> {
    const { sql, parameters } = compiledQuery;

    try {
      // prepared statement 캐싱
      let stmt = this.statementCache.get(sql);
      if (!stmt) {
        stmt = this.db.prepare(sql);
        this.statementCache.set(sql, stmt);
      }

      // SELECT vs INSERT/UPDATE/DELETE 구분
      const isSelect = sql.trimStart().toUpperCase().startsWith('SELECT');
      const isReturning = sql.toUpperCase().includes('RETURNING');

      if (isSelect || isReturning) {
        const rows = stmt.all(...(parameters as SqliteValue[])) as R[];
        return {
          rows,
        };
      } else {
        const result = stmt.run(...(parameters as SqliteValue[]));
        return {
          rows: [],
          numAffectedRows: BigInt(result.changes),
          insertId: result.lastInsertRowid !== undefined ? BigInt(result.lastInsertRowid) : undefined,
        };
      }
    } catch (error) {
      // 캐시된 statement가 문제일 수 있으므로 제거
      this.statementCache.delete(sql);
      throw error;
    }
  }

  // eslint-disable-next-line require-yield
  async *streamQuery<R>(): AsyncIterableIterator<QueryResult<R>> {
    throw new Error('Streaming is not supported by node:sqlite dialect');
  }
}

//------------------------------------------------------------------------------
// Driver
//------------------------------------------------------------------------------

class NodeSqliteDriver implements Driver {
  private config: NodeSqliteDialectConfig;
  private db: DatabaseSync | null = null;
  private connection: NodeSqliteConnection | null = null;

  constructor(config: NodeSqliteDialectConfig) {
    this.config = config;
  }

  async init(): Promise<void> {
    // 데이터베이스 파일의 부모 디렉토리가 없으면 생성
    // (인메모리 DB가 아닌 경우에만)
    if (this.config.database !== ':memory:') {
      const dir = dirname(this.config.database);
      mkdirSync(dir, { recursive: true });
    }

    this.db = new DatabaseSync(this.config.database);

    // 기본 PRAGMA 설정
    this.db.exec('PRAGMA foreign_keys = ON');
    this.db.exec('PRAGMA journal_mode = WAL');

    // 커스텀 PRAGMA 설정
    if (this.config.pragmas) {
      for (const [key, value] of Object.entries(this.config.pragmas)) {
        const pragmaValue = typeof value === 'boolean' ? (value ? 'ON' : 'OFF') : value;
        this.db.exec(`PRAGMA ${key} = ${pragmaValue}`);
      }
    }

    this.connection = new NodeSqliteConnection(this.db);
  }

  async acquireConnection(): Promise<DatabaseConnection> {
    if (!this.connection) {
      throw new Error('Driver not initialized. Call init() first.');
    }
    return this.connection;
  }

  async beginTransaction(connection: DatabaseConnection, settings: TransactionSettings): Promise<void> {
    const conn = connection as NodeSqliteConnection;
    if (settings.isolationLevel) {
      // SQLite는 제한된 격리 수준만 지원
      conn.db.exec('BEGIN IMMEDIATE');
    } else {
      conn.db.exec('BEGIN');
    }
  }

  async commitTransaction(connection: DatabaseConnection): Promise<void> {
    const conn = connection as NodeSqliteConnection;
    conn.db.exec('COMMIT');
  }

  async rollbackTransaction(connection: DatabaseConnection): Promise<void> {
    const conn = connection as NodeSqliteConnection;
    conn.db.exec('ROLLBACK');
  }

  async releaseConnection(): Promise<void> {
    // node:sqlite는 동기식이므로 연결 풀이 필요 없음
  }

  async destroy(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.connection = null;
    }
  }
}

//------------------------------------------------------------------------------
// Dialect
//------------------------------------------------------------------------------

export class NodeSqliteDialect implements Dialect {
  private config: NodeSqliteDialectConfig;

  constructor(config: NodeSqliteDialectConfig) {
    this.config = config;
  }

  createDriver(): Driver {
    return new NodeSqliteDriver(this.config);
  }

  createQueryCompiler(): QueryCompiler {
    return new SqliteQueryCompiler();
  }

  createAdapter(): DialectAdapter {
    return new SqliteAdapter();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createIntrospector(db: Kysely<any>): DatabaseIntrospector {
    return new SqliteIntrospector(db);
  }
}
