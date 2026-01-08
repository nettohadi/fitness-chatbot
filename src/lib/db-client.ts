import { Pool } from 'pg';
import { createClient } from '@supabase/supabase-js';

// Database mode: 'local' or 'supabase'
const databaseMode = process.env.DATABASE_MODE || 'supabase';

// Local PostgreSQL connection
let pgPool: Pool | null = null;

if (databaseMode === 'local') {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required when DATABASE_MODE is "local"');
  }
  pgPool = new Pool({
    connectionString: databaseUrl,
  });
}

// Supabase connection (for production or if preferred)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase: any = null;
let supabaseAdmin: any = null;

if (databaseMode === 'supabase') {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase credentials are required when DATABASE_MODE is "supabase"');
  }
  supabase = createClient(supabaseUrl, supabaseAnonKey);
  supabaseAdmin = supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey)
    : supabase;
}

/**
 * Universal database client that works with both local PostgreSQL and Supabase
 */
export const db = {
  mode: databaseMode,

  /**
   * Execute a query (for local PostgreSQL)
   */
  async query(text: string, params?: any[]) {
    if (databaseMode === 'local') {
      if (!pgPool) throw new Error('PostgreSQL pool not initialized');
      return pgPool.query(text, params);
    }
    throw new Error('query() is only available in local mode');
  },

  /**
   * Get Supabase client (for Supabase mode)
   */
  getSupabase() {
    if (databaseMode === 'supabase') {
      return supabaseAdmin || supabase;
    }
    throw new Error('Supabase is only available when DATABASE_MODE is "supabase"');
  },

  /**
   * Get PostgreSQL pool (for local mode)
   */
  getPool() {
    if (databaseMode === 'local') {
      return pgPool;
    }
    throw new Error('PostgreSQL pool is only available when DATABASE_MODE is "local"');
  },
};

// Export for backwards compatibility
export { supabase, supabaseAdmin, pgPool };
