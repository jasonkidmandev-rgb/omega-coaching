import { createGzip } from 'zlib';
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { createConnection } from 'mysql2/promise';
import cron from 'node-cron';

const BACKUP_PREFIX = 'db-backups/';
const KEEP_DAYS = 7;

function getR2Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

function escapeSqlValue(val: unknown): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number' || typeof val === 'bigint') return String(val);
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
  if (Buffer.isBuffer(val)) return `X'${val.toString('hex')}'`;
  const str = String(val)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\0/g, '\\0');
  return `'${str}'`;
}

async function generateSqlDump(): Promise<Buffer> {
  const conn = await createConnection({
    uri: process.env.DATABASE_URL!,
    ssl: { rejectUnauthorized: false },
  });

  const chunks: string[] = [];
  chunks.push(`-- Railway MySQL Backup\n-- Generated: ${new Date().toISOString()}\n\n`);
  chunks.push(`SET FOREIGN_KEY_CHECKS=0;\n\n`);

  try {
    const [tables] = await conn.execute<any[]>('SHOW TABLES');
    const tableNames = tables.map((row: any) => Object.values(row)[0] as string);

    for (const table of tableNames) {
      const [[createResult]] = await conn.execute<any[]>(`SHOW CREATE TABLE \`${table}\``);
      const createSql = (createResult as any)['Create Table'];
      chunks.push(`-- Table: ${table}\n`);
      chunks.push(`DROP TABLE IF EXISTS \`${table}\`;\n`);
      chunks.push(`${createSql};\n\n`);

      const [rows] = await conn.execute<any[]>(`SELECT * FROM \`${table}\``);
      if (rows.length > 0) {
        const columns = Object.keys(rows[0]).map(c => `\`${c}\``).join(', ');
        for (let i = 0; i < rows.length; i += 100) {
          const batch = rows.slice(i, i + 100);
          const values = batch
            .map(row => `(${Object.values(row).map(escapeSqlValue).join(', ')})`)
            .join(',\n  ');
          chunks.push(`INSERT INTO \`${table}\` (${columns}) VALUES\n  ${values};\n`);
        }
        chunks.push('\n');
      }
    }

    chunks.push(`SET FOREIGN_KEY_CHECKS=1;\n`);
  } finally {
    await conn.end();
  }

  const sql = chunks.join('');

  return new Promise((resolve, reject) => {
    const gzip = createGzip();
    const buffers: Buffer[] = [];
    gzip.on('data', (chunk: Buffer) => buffers.push(chunk));
    gzip.on('end', () => resolve(Buffer.concat(buffers)));
    gzip.on('error', reject);
    gzip.write(sql);
    gzip.end();
  });
}

async function pruneOldBackups(): Promise<void> {
  const s3 = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME!;
  const cutoff = new Date(Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000);

  const list = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: BACKUP_PREFIX }));
  const toDelete = (list.Contents || []).filter(obj => obj.LastModified && obj.LastModified < cutoff);

  if (toDelete.length > 0) {
    await s3.send(new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: { Objects: toDelete.map(obj => ({ Key: obj.Key! })) },
    }));
    console.log(`[DBBackup] Pruned ${toDelete.length} old backup(s)`);
  }
}

async function runBackup(): Promise<void> {
  const dateStr = new Date().toISOString().slice(0, 10);
  const key = `${BACKUP_PREFIX}db-backup-${dateStr}.sql.gz`;
  console.log(`[DBBackup] Starting backup → ${key}`);
  try {
    const data = await generateSqlDump();
    const s3 = getR2Client();
    await s3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: data,
      ContentType: 'application/gzip',
    }));
    await pruneOldBackups();
    console.log(`[DBBackup] Complete — ${(data.length / 1024).toFixed(1)} KB compressed`);
  } catch (err) {
    console.error('[DBBackup] Failed:', err);
  }
}

export function initDbBackupCron(): void {
  if (!process.env.DATABASE_URL || !process.env.R2_ACCOUNT_ID) {
    console.warn('[DBBackup] Missing DATABASE_URL or R2 config — backup cron not started');
    return;
  }
  // Daily at 3:00 AM UTC
  cron.schedule('0 3 * * *', runBackup, { timezone: 'UTC' });
  console.log('[DBBackup] Daily backup cron scheduled (3:00 AM UTC → R2)');
}
