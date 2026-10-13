import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('data/codetrack.db');
const items = db.prepare('SELECT platform, status, error_code, error_message FROM scan_job_items ORDER BY started_at DESC LIMIT 5').all();
console.log('Recent scan items:', items);
