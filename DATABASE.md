# Database Management Guide

## Quick Start

### 1. Start Database
```bash
npm run db:start
```

### 2. Run Migrations (First Time Setup)
```bash
npm run db:setup
```
This will:
- Start PostgreSQL
- Run migrations
- Generate Prisma client

### 3. Check Database Status
```bash
npm run db:status
```

---

## Available Scripts

### Database Control
- `npm run db:start` - Start PostgreSQL service
- `npm run db:stop` - Stop PostgreSQL service
- `npm run db:status` - Check if PostgreSQL is running

### Migrations
- `npm run db:migrate` - Create and run new migration (development)
- `npm run db:migrate:deploy` - Run migrations (production)
- `npm run db:push` - Push schema changes without creating migration
- `npm run db:reset` - Reset database (WARNING: deletes all data)

### Prisma Client
- `npm run db:generate` - Generate Prisma client
- `npm run db:studio` - Open Prisma Studio (database GUI)

### Complete Setup
- `npm run db:setup` - One command to start DB, migrate, and generate client

---

## When to Run `prisma generate`?

### Automatic Generation (Already Set Up)
✅ **After `npm install`** - The `postinstall` script automatically runs `prisma generate`

### Manual Generation Required
You MUST run `npm run db:generate` (or `npx prisma generate`) when:

1. **After schema changes** - When you modify `prisma/schema.prisma`:
   ```bash
   # Make changes to schema.prisma
   npm run db:generate
   ```

2. **After pulling from git** - If someone else changed the schema:
   ```bash
   git pull
   npm run db:generate
   ```

3. **After running migrations**:
   ```bash
   npm run db:migrate
   # Migration automatically runs generate, but if it fails:
   npm run db:generate
   ```

4. **TypeScript errors about Prisma types** - If you see errors like `Property 'user' does not exist on type 'PrismaClient'`:
   ```bash
   npm run db:generate
   ```

### What Does `prisma generate` Do?
- Reads your `schema.prisma`
- Generates TypeScript types in `node_modules/@prisma/client`
- Creates type-safe database client with autocomplete
- Updates types to match your schema

---

## Common Workflows

### First Time Setup
```bash
# 1. Start database
npm run db:start

# 2. Run migrations and generate client
npm run db:setup

# 3. Verify it works
npm run db:status
```

### After Changing Schema
```bash
# 1. Edit prisma/schema.prisma
# 2. Create migration
npm run db:migrate

# That's it! The migrate command automatically:
# - Creates migration file
# - Applies migration to database
# - Regenerates Prisma client
```

### View Database
```bash
npm run db:studio
# Opens Prisma Studio at http://localhost:5555
```

### Reset Everything (Development Only)
```bash
npm run db:reset
# WARNING: This deletes all data!
```

---

## Current Migration Status

After your next migration (`add_fitness_profile_and_exercises`), you'll have:

### New Fields on `users` table:
- `age` - User's age
- `gender` - Male or female
- `weight_kg` - Weight in kilograms
- `height_cm` - Height in centimeters
- `activity_level` - Activity level
- `bmr` - Basal Metabolic Rate
- `tdee` - Total Daily Energy Expenditure
- `daily_calorie_goal` - Daily calorie target
- `profile_completed` - Profile setup status
- `preferred_language` - User's language preference

### New `exercise_entries` table:
- Exercise type
- Duration in minutes
- Calories burned
- MET value
- Entry date and time

---

## Troubleshooting

### PostgreSQL not starting?
```bash
# Check if it's installed
brew list | grep postgresql

# If not installed:
brew install postgresql@14
brew services start postgresql@14

# Create database
createdb fitness_chatbot
```

### Migration fails?
```bash
# Check database connection
npx prisma db pull

# Reset and try again
npm run db:reset
npm run db:migrate
```

### Prisma Client errors?
```bash
# Regenerate client
npm run db:generate

# If still failing, clean install:
rm -rf node_modules
npm install
```

---

## Summary

**You only need to run `prisma generate` manually when:**
1. You change `schema.prisma` and don't run a migration
2. You get TypeScript errors about missing Prisma types
3. You pull schema changes from git

**Most of the time, it's automatic because:**
- `postinstall` runs it after `npm install`
- `db:migrate` runs it after migrations
- `db:setup` includes it in the setup process

**For daily work:**
```bash
# Start database once
npm run db:start

# Change schema → run migration (generates client automatically)
npm run db:migrate

# That's it! 🎉
```
