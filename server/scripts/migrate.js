import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { waitForDatabase, query, pool } from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  await waitForDatabase();
  const dir = path.join(__dirname, '..', 'migrations');
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = await fs.readFile(path.join(dir, file), 'utf8');
    console.log(`[migrate] applying ${file}`);
    await query(sql);
  }
  console.log('[migrate] done');
  await pool.end();
}

main().catch((err) => {
  console.error('[migrate] failed:', err.message);
  process.exit(1);
});
