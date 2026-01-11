# Deployment Guide: Supabase + Vercel

## Part 1: Setting Up Supabase Database

### Step 1: Get Your Supabase Credentials

1. Go to your Supabase project dashboard
2. Click on **Project Settings** (gear icon in the sidebar)
3. Go to **Database** section
4. Copy these values:
   - **Host** (looks like: `db.xxx.supabase.co`)
   - **Database name** (usually `postgres`)
   - **Port** (usually `5432`)
   - **User** (usually `postgres`)
   - **Password** (the password you set when creating the project)

5. Also go to **API** section and copy:
   - **Project URL** (looks like: `https://xxx.supabase.co`)
   - **anon/public key**

### Step 2: Construct Your Database URL

Your `DATABASE_URL` should be in this format:
```
postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true&connection_limit=1
```

Example:
```
postgresql://postgres:mypassword123@db.abcdefghijklmn.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1
```

For direct connection (used for migrations), use:
```
postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

### Step 3: Update Your Local .env File

Update your `.env` file:

```env
# Supabase Database (for Prisma)
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Telegram Bot
TELEGRAM_BOT_TOKEN="your_telegram_bot_token"

# Anthropic API
ANTHROPIC_API_KEY="your_anthropic_api_key"

# For local development only
NGROK_URL="your_ngrok_url"
```

### Step 4: Run Database Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to Supabase
npx prisma db push

# Verify the tables were created
npx prisma studio
```

This will create all the tables in your Supabase database.

### Step 5: Verify Tables in Supabase

1. Go to your Supabase dashboard
2. Click on **Table Editor** in the sidebar
3. You should see these tables:
   - `users`
   - `calorie_entries`
   - `exercise_entries`
   - `conversation_logs`

---

## Part 2: Deploying to Vercel

### Step 1: Install Vercel CLI (Optional but Recommended)

```bash
npm install -g vercel
```

### Step 2: Prepare Your Project

1. Make sure your `package.json` has the build script:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "prisma:generate": "prisma generate"
  }
}
```

2. Create a `vercel.json` file in your project root:

```json
{
  "buildCommand": "prisma generate && next build",
  "devCommand": "next dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["sin1"]
}
```

### Step 3: Deploy to Vercel

**Option A: Deploy via Vercel CLI**

```bash
# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

**Option B: Deploy via GitHub (Recommended)**

1. Push your code to GitHub:
```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

2. Go to [vercel.com](https://vercel.com)
3. Click **"Add New Project"**
4. Import your GitHub repository
5. Vercel will auto-detect Next.js

### Step 4: Configure Environment Variables in Vercel

1. In your Vercel project dashboard, go to **Settings** → **Environment Variables**
2. Add these variables:

```
DATABASE_URL = postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true&connection_limit=1

DIRECT_URL = postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

TELEGRAM_BOT_TOKEN = your_telegram_bot_token

ANTHROPIC_API_KEY = your_anthropic_api_key
```

**Important:** Do NOT add `NGROK_URL` to Vercel - that's only for local development.

3. Click **Save** for each variable

### Step 5: Deploy

If using GitHub integration:
- Vercel will automatically deploy on every push to main branch
- Wait for the deployment to complete (usually 2-3 minutes)
- You'll get a URL like: `https://your-project.vercel.app`

If using CLI:
```bash
vercel --prod
```

### Step 6: Set Telegram Webhook to Vercel

Once deployed, you need to update your Telegram webhook to point to Vercel instead of Ngrok.

**Method 1: Using curl**

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-project.vercel.app/api/webhook",
    "allowed_updates": ["message"]
  }'
```

**Method 2: Using your browser**

Visit this URL (replace `<YOUR_BOT_TOKEN>` and `<YOUR_VERCEL_URL>`):

```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://your-project.vercel.app/api/webhook
```

**Method 3: Create a setup script**

Create `scripts/set-webhook-vercel.sh`:

```bash
#!/bin/bash

# Load environment variables
source .env

# Set the webhook
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"https://your-project.vercel.app/api/webhook\",
    \"allowed_updates\": [\"message\"]
  }"
```

Then run:
```bash
chmod +x scripts/set-webhook-vercel.sh
./scripts/set-webhook-vercel.sh
```

### Step 7: Verify Webhook

Check if the webhook is set correctly:

```bash
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
```

You should see:
```json
{
  "ok": true,
  "result": {
    "url": "https://your-project.vercel.app/api/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

---

## Part 3: Testing Your Deployment

### Test 1: Check if the API is running

Visit: `https://your-project.vercel.app/api/webhook`

You should see:
```json
{"error":"Method not allowed"}
```

This is correct! The webhook only accepts POST requests.

### Test 2: Send a message to your bot

1. Open Telegram
2. Find your bot
3. Send a message like "Hi"
4. The bot should respond

### Test 3: Check Vercel Logs

1. Go to your Vercel project dashboard
2. Click on **Logs** tab
3. You should see incoming requests and responses

### Test 4: Check Supabase Database

1. Go to Supabase dashboard
2. Click **Table Editor**
3. Click on `users` table
4. You should see your user entry

---

## Troubleshooting

### Issue: "Prisma Client could not locate the Query Engine"

**Solution:** Add this to your `package.json`:
```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

And ensure `postinstall` script exists:
```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

### Issue: "Database connection error"

**Solutions:**
1. Verify your `DATABASE_URL` is correct
2. Check Supabase is not paused (free tier pauses after 7 days of inactivity)
3. Make sure you're using the connection pooler URL with `?pgbouncer=true`

### Issue: "Telegram webhook not receiving messages"

**Solutions:**
1. Verify webhook is set: `curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo`
2. Check Vercel deployment is successful
3. Check Vercel function logs for errors
4. Make sure the webhook URL is exactly: `https://your-project.vercel.app/api/webhook`

### Issue: "Function timeout on Vercel"

**Solution:** Vercel free tier has 10-second timeout. If Claude takes too long:
1. Upgrade to Vercel Pro (60-second timeout)
2. Or optimize your prompts to be shorter

---

## Important Notes

1. **Ngrok is only for local development** - Don't use it in production
2. **Environment variables are different** - Local uses `.env`, Vercel uses project settings
3. **Database pooling** - Always use `?pgbouncer=true` for Vercel (serverless functions)
4. **Cold starts** - First request after inactivity might be slow (normal for serverless)
5. **Logs** - Check Vercel logs for debugging, not your local terminal

---

## Monitoring Your Production Bot

### Check Vercel Logs
```bash
vercel logs <your-project-url>
```

### Check Supabase Logs
1. Go to Supabase dashboard
2. Click **Logs** in sidebar
3. Select **Postgres Logs**

### Check Telegram Webhook Status
```bash
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
```

---

## Updating Your Bot

When you make changes:

1. Test locally first:
```bash
npm run dev
# Use ngrok for local testing
```

2. Commit and push:
```bash
git add .
git commit -m "Update bot features"
git push origin main
```

3. Vercel will automatically deploy the new version

4. Check the deployment in Vercel dashboard

---

## Cost Breakdown

- **Supabase Free Tier:** 500 MB database, 2 GB bandwidth
- **Vercel Free Tier:** 100 GB bandwidth, unlimited deployments
- **Anthropic API:** Pay per token (Claude Sonnet ~$3 per million input tokens)
- **Telegram Bot:** Free

**Total cost for small usage:** Nearly free!

---

## Next Steps

1. Set up monitoring (optional):
   - Vercel Analytics
   - Sentry for error tracking

2. Set up a custom domain (optional):
   - Add domain in Vercel settings
   - Update webhook to custom domain

3. Enable Vercel Analytics (optional):
   ```bash
   npm install @vercel/analytics
   ```

---

## Quick Reference Commands

```bash
# Deploy to Vercel
vercel --prod

# Check Vercel logs
vercel logs

# Set Telegram webhook
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://your-app.vercel.app/api/webhook"

# Check webhook status
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"

# Run Prisma migrations
npx prisma db push

# Generate Prisma client
npx prisma generate

# Open Prisma Studio
npx prisma studio
```

---

That's it! Your bot should now be running on Vercel with Supabase database. 🚀
