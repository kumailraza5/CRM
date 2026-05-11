const { Pool } = require('pg');

async function createTables() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Creating followups table...');
    await pool.query(`
      CREATE TYPE IF NOT EXISTS followup_type AS ENUM('call', 'email', 'linkedin_message', 'meeting', 'proposal', 'demo', 'check_in', 'custom')
    `);
    
    await pool.query(`
      CREATE TYPE IF NOT EXISTS followup_priority AS ENUM('urgent', 'high', 'medium', 'low')
    `);
    
    await pool.query(`
      CREATE TYPE IF NOT EXISTS followup_status AS ENUM('pending', 'completed', 'skipped', 'rescheduled')
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS followups (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        type followup_type NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        priority followup_priority DEFAULT 'medium' NOT NULL,
        status followup_status DEFAULT 'pending' NOT NULL,
        scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
        reminder_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        is_notified BOOLEAN DEFAULT false NOT NULL,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      )
    `);

    console.log('Creating notifications table...');
    
    await pool.query(`
      CREATE TYPE IF NOT EXISTS notification_type AS ENUM('followup_due', 'followup_overdue', 'lead_score_change', 'data_enrichment_needed', 'pipeline_bottleneck', 'revenue_milestone', 'system')
    `);
    
    await pool.query(`
      CREATE TYPE IF NOT EXISTS notification_priority AS ENUM('urgent', 'high', 'medium', 'low')
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        type notification_type NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        priority notification_priority DEFAULT 'medium' NOT NULL,
        is_read BOOLEAN DEFAULT false NOT NULL,
        lead_id INTEGER REFERENCES leads(id),
        action_url TEXT,
        action_text TEXT,
        expires_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        read_at TIMESTAMP WITH TIME ZONE
      )
    `);

    console.log('Tables created successfully!');

    // Verify tables exist
    const result = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('followups', 'notifications')
    `);
    
    console.log('Tables created:', result.rows.map(r => r.table_name));

  } catch (error) {
    console.error('Error creating tables:', error);
  } finally {
    await pool.end();
  }
}

createTables();
