const fs = require('fs');
const path = require('path');
const env = fs.readFileSync(path.resolve('.env'), 'utf8');
const match = env.match(/DATABASE_URL\s*=\s*\"?([^\"\r\n]+)\"?/);
if (!match) {
  console.error('DATABASE_URL not found');
  process.exit(1);
}
const url = match[1].trim();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: url });
(async () => {
  try {
    const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='User' ORDER BY ordinal_position");
    console.log('DB URL:', url);
    console.log('Columns:');
    console.log(cols.rows.map(r => r.column_name).join(', '));
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
