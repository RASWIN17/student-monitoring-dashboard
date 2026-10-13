import fs from 'fs';
const txt = fs.readFileSync('lib/connectors/scanner.ts', 'utf8');
const lines = txt.split('\n');
lines.forEach((l, i) => {
  if (l.includes('db.prepare') && l.includes('"')) {
    console.log(`scanner.ts:${i + 1}: ${l}`);
  }
});
