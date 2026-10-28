/** Thin D1 wrapper that adds up the rows each query reads and writes, for the usage meter. */
export class MeteredDb {
  reads = 0;
  writes = 0;

  constructor(private readonly raw: D1Database) {}

  prepare(sql: string, ...params: unknown[]): D1PreparedStatement {
    return this.raw.prepare(sql).bind(...params);
  }

  private add(meta: { rows_read?: number; rows_written?: number }): void {
    this.reads += meta.rows_read ?? 0;
    this.writes += meta.rows_written ?? 0;
  }

  async all<T>(sql: string, ...params: unknown[]): Promise<T[]> {
    const result = await this.prepare(sql, ...params).all<T>();
    this.add(result.meta);
    return result.results;
  }

  async first<T>(sql: string, ...params: unknown[]): Promise<T | null> {
    return (await this.all<T>(sql, ...params))[0] ?? null;
  }

  async run(sql: string, ...params: unknown[]): Promise<D1Result> {
    const result = await this.prepare(sql, ...params).run();
    this.add(result.meta);
    return result;
  }

  async batch(statements: D1PreparedStatement[]): Promise<D1Result[]> {
    const results = await this.raw.batch(statements);
    results.forEach((r) => this.add(r.meta));
    return results;
  }
}
