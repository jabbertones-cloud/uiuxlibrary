import { DurableObject } from 'cloudflare:workers';

export class CaptureQuota extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec('CREATE TABLE IF NOT EXISTS reservations (id TEXT PRIMARY KEY, created_ms INTEGER NOT NULL)');
  }

  async reserve() {
    const now = Date.now();
    return this.ctx.storage.transactionSync(() => {
      this.sql.exec('DELETE FROM reservations WHERE created_ms < ?', now - 86400000);
      const count = this.sql.exec(
        'SELECT COUNT(*) AS day, SUM(CASE WHEN created_ms >= ? THEN 1 ELSE 0 END) AS minute FROM reservations',
        now - 60000
      ).one();
      if (Number(count.minute ?? 0) >= 4 || Number(count.day ?? 0) >= 50)
        return { allowed: false, reason: 'CAPTURE_QUOTA_EXCEEDED' };
      const id = crypto.randomUUID();
      this.sql.exec('INSERT INTO reservations (id, created_ms) VALUES (?, ?)', id, now);
      return { allowed: true, id };
    });
  }
}
