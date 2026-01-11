# Deployment Checklist

## ✅ Pre-Deployment Checklist

### 1. Supabase Setup
- [ ] Created Supabase project
- [ ] Copied database credentials (host, password, etc.)
- [ ] Constructed `DATABASE_URL` and `DIRECT_URL`
- [ ] Updated local `.env` file with Supabase URLs
- [ ] Ran `npx prisma db push` to create tables
- [ ] Verified tables exist in Supabase Table Editor

### 2. Vercel Setup
- [ ] Created Vercel account
- [ ] Installed Vercel CLI (optional): `npm install -g vercel`
- [ ] Connected GitHub repository to Vercel (if using GitHub)

### 3. Environment Variables Prepared
- [ ] `DATABASE_URL` (with `?pgbouncer=true`)
- [ ] `DIRECT_URL` (without pgbouncer)
- [ ] `TELEGRAM_BOT_TOKEN`
- [ ] `ANTHROPIC_API_KEY`

---

## 🚀 Deployment Steps

### Step 1: Test Locally First
```bash
# Make sure everything works locally
npm run dev

# Test with your bot via ngrok
# Send a message and verify it works
```

### Step 2: Push to GitHub (if using GitHub deployment)
```bash
git add .
git commit -m "Ready for production deployment"
git push origin main
```

### Step 3: Deploy to Vercel

**Option A: Via Vercel Dashboard**
1. Go to vercel.com
2. Click "New Project"
3. Import your GitHub repository
4. Add environment variables
5. Click "Deploy"

**Option B: Via CLI**
```bash
vercel --prod
```

### Step 4: Add Environment Variables in Vercel
1. Go to Project Settings → Environment Variables
2. Add each variable:
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `TELEGRAM_BOT_TOKEN`
   - `ANTHROPIC_API_KEY`
3. Make sure to select "Production" environment

### Step 5: Set Telegram Webhook
```bash
# Replace YOUR_VERCEL_URL with your actual Vercel URL
./scripts/set-webhook.sh https://your-project.vercel.app/api/webhook
```

### Step 6: Verify Everything Works
```bash
# Check webhook status
./scripts/check-webhook.sh

# Send a test message to your bot
# Check Vercel logs for any errors
```

---

## 🧪 Testing Checklist

- [ ] Bot responds to messages
- [ ] Profile setup works
- [ ] Can log food entries
- [ ] Can log exercise entries
- [ ] Can update/delete entries
- [ ] Daily summary works
- [ ] Weekly/monthly reports work
- [ ] Deficit target saves correctly
- [ ] Language detection works (Indonesian/English)

---

## 📊 Post-Deployment Monitoring

### Check Vercel Logs
```bash
vercel logs --follow
```

Or visit: Vercel Dashboard → Your Project → Logs

### Check Supabase Database
1. Go to Supabase Dashboard
2. Click Table Editor
3. Verify data is being saved

### Check Webhook Status
```bash
./scripts/check-webhook.sh
```

---

## 🔧 Troubleshooting

### Bot not responding?
- [ ] Check Vercel deployment status
- [ ] Check webhook is set correctly: `./scripts/check-webhook.sh`
- [ ] Check Vercel function logs for errors
- [ ] Verify environment variables are set in Vercel

### Database errors?
- [ ] Check `DATABASE_URL` has `?pgbouncer=true`
- [ ] Verify Supabase project is not paused
- [ ] Run `npx prisma db push` if schema changed
- [ ] Check Supabase logs

### Timeout errors?
- [ ] Vercel free tier has 10-second timeout
- [ ] Consider upgrading to Vercel Pro for 60-second timeout
- [ ] Or optimize Claude prompts to be shorter

---

## 📝 Quick Commands Reference

```bash
# Deploy to production
vercel --prod

# Check deployment logs
vercel logs --follow

# Set webhook
./scripts/set-webhook.sh https://your-app.vercel.app/api/webhook

# Check webhook status
./scripts/check-webhook.sh

# Update database schema
npx prisma db push

# View database
npx prisma studio

# Test locally
npm run dev
```

---

## 🎯 Success Criteria

Your deployment is successful when:
- ✅ Vercel deployment shows "Ready"
- ✅ Webhook is set to Vercel URL
- ✅ Bot responds to test messages
- ✅ Data saves to Supabase
- ✅ No errors in Vercel logs

---

## 💰 Cost Monitoring

### Free Tier Limits
- **Vercel:** 100 GB bandwidth/month
- **Supabase:** 500 MB database, 2 GB bandwidth
- **Anthropic:** ~$3 per million tokens

### When to Upgrade
- Vercel: When you need >10s timeout or >100 GB bandwidth
- Supabase: When you exceed 500 MB database
- Both should handle 100s of users on free tier

---

## 🔄 Updating the Bot

When you make changes:

1. **Test locally:**
   ```bash
   npm run dev
   ```

2. **Commit changes:**
   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin main
   ```

3. **Vercel auto-deploys** (if GitHub integration)
   - Or run: `vercel --prod`

4. **No need to update webhook** - URL stays the same

---

## ❓ Need Help?

Common issues:
1. **"Function timeout"** → Upgrade Vercel or optimize prompts
2. **"Database connection failed"** → Check DATABASE_URL format
3. **"Bot not responding"** → Check webhook and Vercel logs
4. **"Prisma error"** → Run `npx prisma generate`

Check the full [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed solutions.
