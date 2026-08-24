/* Quick DB verification script — queries users and password reset tokens.
   Run from repo root: `cd sentinews_backend; node scripts/check_db.js`
*/

require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('[db-check] DATABASE_URL is not set in .env');
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function main() {
  console.log('[db-check] Connecting to database...');

  // Inspect public tables to determine actual table naming
  // List tables in all schemas
  const allTables = await pool.query("SELECT schemaname, tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema') ORDER BY schemaname, tablename");
  console.log('[db-check] found tables:');
  allTables.rows.forEach((r) => console.log(`- ${r.schemaname}.${r.tablename}`));

  const tableNames = allTables.rows.map((r) => ({ schema: r.schemaname, name: r.tablename }));

  // Determine likely user & token table names (schema + name)
  const userEntry = tableNames.find((t) => t.name.toLowerCase() === 'user') || tableNames.find((t) => t.name.toLowerCase().includes('user'));
  const tokenEntry = tableNames.find((t) => t.name.toLowerCase().includes('passwordreset')) || tableNames.find((t) => t.name.toLowerCase().includes('password'));

  if (!userEntry) throw new Error('Unable to locate a users table in database');
  if (!tokenEntry) throw new Error('Unable to locate a password reset token table in database');

  const userQualified = `"${userEntry.schema}"."${userEntry.name}"`;
  const tokenQualified = `"${tokenEntry.schema}"."${tokenEntry.name}"`;

  const userRes = await pool.query(`SELECT COUNT(*)::int as count FROM ${userQualified}`);
  const tokenRes = await pool.query(`SELECT COUNT(*)::int as count FROM ${tokenQualified}`);

  const users = await pool.query(`SELECT id, email, "mobileNumber", "createdAt" FROM ${userQualified} ORDER BY "createdAt" DESC LIMIT 10`);

  console.log(`Users total: ${userRes.rows[0].count}`);
  console.log(`PasswordResetToken total: ${tokenRes.rows[0].count}`);
  console.log('Recent users (up to 10):');
  users.rows.forEach((u) => console.log(`- ${u.id} | ${u.email} | ${u.mobileNumber ?? '<no-mobile>'} | ${new Date(u.createdAt).toISOString()}`));

  await pool.end();
}

main().catch((e) => {
  console.error('[db-check] Error:', e);
  process.exitCode = 1;
});
