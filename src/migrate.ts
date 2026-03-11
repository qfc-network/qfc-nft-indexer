import 'dotenv/config';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getPool, closePool } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const sql = readFileSync(
    join(__dirname, '..', 'migrations', '001_init.sql'),
    'utf-8',
  );

  console.log('[migrate] running 001_init.sql...');
  await getPool().query(sql);
  console.log('[migrate] done');
  await closePool();
}

migrate().catch((err) => {
  console.error('[migrate] failed:', err);
  process.exit(1);
});
