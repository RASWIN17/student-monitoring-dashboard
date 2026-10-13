import fs from 'fs';
const txt = fs.readFileSync('lib/db.ts', 'utf8');
const lines = txt.split('\n');
let count = 0;
lines.forEach((l, i) => {
  if (l.includes('db.prepare') && l.includes('"')) {
    console.log(`Line ${i + 1}: ${l}`);
    count++;
  }
});
console.log(`Total found: ${count}`);
