# Database Migration Guide - Dashboard Tables

This guide covers the database migration to add the three new tables required for the admin and user dashboard functionality.

## New Tables Added

### 1. **admin_users** - Admin Authentication
Stores admin user credentials for dashboard access.

**Fields:**
- `id` (UUID) - Primary key
- `email` (VARCHAR 255) - Unique email address
- `password_hash` (VARCHAR 255) - Bcrypt hashed password
- `full_name` (VARCHAR 100) - Admin's full name
- `role` (VARCHAR 20) - Role (default: "admin")
- `created_at` (TIMESTAMPTZ) - Account creation time
- `updated_at` (TIMESTAMPTZ) - Last update time
- `last_login_at` (TIMESTAMPTZ) - Last successful login

### 2. **claude_api_logs** - API Request Logging
Tracks all requests made to the Claude API for monitoring and cost analysis.

**Fields:**
- `id` (UUID) - Primary key
- `user_id` (UUID, nullable) - Foreign key to users table
- `model` (VARCHAR 50) - Claude model used (e.g., "claude-sonnet-4-20250514")
- `system_prompt` (TEXT) - System prompt sent
- `messages` (JSON) - Array of message objects
- `response` (TEXT) - Claude's response
- `input_tokens` (INT) - Input token count
- `output_tokens` (INT) - Output token count
- `total_cost` (DECIMAL 10,6) - Cost in USD
- `latency_ms` (INT) - Request latency in milliseconds
- `created_at` (TIMESTAMPTZ) - Log entry timestamp

**Indexes:**
- `(user_id, created_at)` - For user-specific log queries
- `(created_at)` - For time-based queries

**Relations:**
- Foreign key to `users.id` with `ON DELETE SET NULL` (keeps logs even if user deleted)

### 3. **otp_sessions** - User OTP Authentication
Manages one-time passwords for user dashboard access.

**Fields:**
- `id` (UUID) - Primary key
- `phone_number` (VARCHAR 20) - User's phone number
- `otp_code` (VARCHAR 6) - 6-digit OTP code
- `expires_at` (TIMESTAMPTZ) - Expiration timestamp (10 minutes from creation)
- `verified` (BOOLEAN) - Whether OTP has been used (default: false)
- `created_at` (TIMESTAMPTZ) - OTP generation time

**Indexes:**
- `(phone_number, expires_at)` - For efficient OTP lookup

---

## Migration Steps

### Step 1: Generate Migration

Run the following command to generate a new migration based on the schema changes:

```bash
npx prisma migrate dev --name add_dashboard_tables
```

This will:
1. Compare current schema with database
2. Generate SQL migration file in `prisma/migrations/`
3. Apply the migration to your database
4. Regenerate Prisma Client

### Step 2: Verify Migration

Check that the migration was created successfully:

```bash
ls -la prisma/migrations/
```

You should see a new directory with a timestamp and name: `YYYYMMDDHHMMSS_add_dashboard_tables/`

### Step 3: Review Migration SQL (Optional)

View the generated SQL to ensure it's correct:

```bash
cat prisma/migrations/YYYYMMDDHHMMSS_add_dashboard_tables/migration.sql
```

Expected SQL should include:
- `CREATE TABLE admin_users (...)`
- `CREATE TABLE claude_api_logs (...)`
- `CREATE TABLE otp_sessions (...)`
- `ALTER TABLE users ADD CONSTRAINT ...` (for claudeApiLogs relation)
- Index creation statements

### Step 4: Apply to Production (When Ready)

For Supabase production database:

```bash
# Using direct URL for migrations (as per prisma.config.ts)
npx prisma migrate deploy
```

---

## Rollback Instructions

If you need to rollback the migration:

### Option 1: Prisma Migrate Reset (Development Only)
⚠️ **WARNING**: This will delete ALL data!

```bash
npx prisma migrate reset
```

### Option 2: Manual Rollback (Safe for Production)

1. Drop the new tables:

```sql
DROP TABLE IF EXISTS otp_sessions CASCADE;
DROP TABLE IF EXISTS claude_api_logs CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;
```

2. Mark the migration as rolled back:

```bash
npx prisma migrate resolve --rolled-back YYYYMMDDHHMMSS_add_dashboard_tables
```

---

## Post-Migration Steps

### 1. Verify Tables Exist

Connect to your database and verify:

```sql
-- Check table exists
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('admin_users', 'claude_api_logs', 'otp_sessions');

-- Check indexes
SELECT indexname FROM pg_indexes
WHERE tablename IN ('admin_users', 'claude_api_logs', 'otp_sessions');
```

### 2. Create First Admin User

Use the admin creation script (will be created next):

```bash
npx tsx scripts/create-admin.ts your-email@example.com YourSecurePassword123 "Your Name"
```

### 3. Test Database Connection

Run a quick test to ensure Prisma can access the new tables:

```bash
npx tsx -e "import { prisma } from './src/lib/prisma'; prisma.adminUser.findMany().then(console.log)"
```

Should output: `[]` (empty array since no admins created yet)

---

## Troubleshooting

### Error: "Migration already applied"
The migration was already run. Check:
```bash
npx prisma migrate status
```

### Error: "Direct execution of DDL (Data Definition Language) SQL statements is disabled"
This is a Supabase limitation. Solution:
1. Run migration locally first: `npx prisma migrate dev`
2. Then deploy to production: `npx prisma migrate deploy`

Alternatively, manually create tables in Supabase SQL Editor.

### Error: "Foreign key constraint fails"
Ensure the `users` table exists before running migration. The `claude_api_logs` table has a foreign key to `users.id`.

### Row-Level Security (RLS) Warnings
If using Supabase, you may see RLS warnings. To enable RLS:

```sql
-- Enable RLS on new tables
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE claude_api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust as needed)
-- Example: Allow service role to access everything
CREATE POLICY "Service role can access admin_users" ON admin_users
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access claude_api_logs" ON claude_api_logs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access otp_sessions" ON otp_sessions
  FOR ALL USING (auth.role() = 'service_role');
```

---

## Data Retention Policy

### Claude API Logs
**Retention**: 7 days

A cron job will automatically clean up logs older than 7 days. This will be implemented in:
- `src/lib/cron/cleanupLogs.ts` - Cleanup function
- `src/app/api/cron/cleanup/route.ts` - Cron endpoint

To manually clean up old logs:

```sql
DELETE FROM claude_api_logs
WHERE created_at < NOW() - INTERVAL '7 days';
```

### OTP Sessions
**Retention**: Auto-cleanup via `expires_at`

OTP sessions expire after 10 minutes. Clean up old sessions periodically:

```sql
DELETE FROM otp_sessions
WHERE expires_at < NOW();
```

---

## Schema Validation

After migration, validate the schema matches:

```bash
npx prisma validate
```

Should output: `Environment variables loaded from .env`
`Prisma schema loaded from prisma/schema.prisma`
`The schema is valid ✅`

---

## Next Steps

After successful migration:

1. ✅ Mark "Add database schema changes" as complete in todo list
2. 📦 Install NextAuth and dependencies
3. ⚙️ Create NextAuth configuration
4. 👤 Create admin creation script
5. 🚀 Build dashboard pages

---

## Reference

**Prisma Documentation:**
- [Migrations](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)

**Supabase Documentation:**
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Direct Connection](https://supabase.com/docs/guides/database/connecting-to-postgres#direct-connections)
