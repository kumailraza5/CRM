const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Database URL not found');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    console.log('Running database migration...');
    
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'drizzle/0001_enhanced_crm.sql'), 
      'utf8'
    );
    
    await pool.query(migrationSQL);
    console.log('Migration completed successfully!');
    
    // Verify tables were created
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('followups', 'notifications')
    `);
    
    console.log('Created tables:', result.rows.map(row => row.table_name));
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

runMigration();
