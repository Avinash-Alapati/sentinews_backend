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
    const result = await pool.query('SELECT id, name, email, role, "createdAt" FROM "User" ORDER BY "createdAt" DESC LIMIT 5');
    console.log('DB URL:', url);
    console.log('Recent users:');
    console.table(result.rows);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
