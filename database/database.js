const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

// Supabase client for auth and storage
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// PostgreSQL pool for direct queries
const pool = new Pool({
  host: process.env.SUPABASE_DB_HOST,
  port: process.env.SUPABASE_DB_PORT,
  database: process.env.SUPABASE_DB_NAME,
  user: process.env.SUPABASE_DB_USER,
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to Supabase:', err.stack);
  } else {
    console.log('✅ Connected to Supabase successfully');
    release();
  }
});

module.exports = { supabase, pool };