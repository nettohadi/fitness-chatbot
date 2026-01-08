# Telegram Calorie Tracking Chatbot

A Telegram chatbot that helps you track your daily calorie intake using AI-powered calorie estimation with Claude AI.

## Features

- **Direct Calorie Logging**: Send "450 calories" to log calories directly
- **AI-Powered Estimation**: Describe food like "100g grilled chicken" and Claude AI estimates the calories
- **Daily/Weekly Summaries**: Check your progress with "today" or "week" commands
- **Easy to Use**: Just chat with the bot naturally
- **Free Messaging**: Telegram Bot API is completely free (no per-message costs)

## Tech Stack

- **Framework**: Next.js 15 (App Router) with TypeScript
- **Database**: PostgreSQL (local) / Supabase (production)
- **ORM**: Prisma with PostgreSQL adapter
- **Messaging**: Telegram Bot API
- **AI**: Anthropic Claude API
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (for future dashboard features)

## Prerequisites

- Node.js 18+
- PostgreSQL (local or Supabase)
- Telegram account
- Anthropic Claude API key

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd fitness-chatbot
npm install
```

### 2. Database Setup

#### Local PostgreSQL

```bash
# Install PostgreSQL (macOS)
brew install postgresql@14
brew services start postgresql@14

# Create database
createdb fitness_chatbot

# Run migrations
npx prisma migrate dev
```

### 3. Create Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send `/newbot` command
3. Follow the prompts to create your bot
4. Copy the bot token (looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 4. Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```env
# Database
DATABASE_URL=postgresql://your_user@localhost:5432/fitness_chatbot

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# Anthropic Claude
ANTHROPIC_API_KEY=your_claude_api_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Run Development Server

```bash
npm run dev
```

## Testing Locally

### Option 1: Using ngrok (recommended for real Telegram testing)

1. Install ngrok:
```bash
brew install ngrok
```

2. Expose your local server:
```bash
ngrok http 3000
```

3. Set webhook URL:
```bash
curl -X POST http://localhost:3000/api/telegram/setup \
  -H "Content-Type: application/json" \
  -d '{"webhookUrl": "https://your-ngrok-url.ngrok.io/api/webhook"}'
```

4. Start chatting with your bot on Telegram!

### Option 2: Using Test Endpoint (no Telegram needed)

```bash
# Test with direct calorie input
curl -X POST http://localhost:3000/api/test \
  -H "Content-Type: application/json" \
  -d '{"chatId": 123456789, "message": "450 calories"}'

# Test with food description
curl -X POST http://localhost:3000/api/test \
  -H "Content-Type: application/json" \
  -d '{"chatId": 123456789, "message": "100g grilled chicken"}'

# Test query commands
curl -X POST http://localhost:3000/api/test \
  -H "Content-Type: application/json" \
  -d '{"chatId": 123456789, "message": "today"}'
```

## Usage Examples

### Direct Calorie Input
```
You: 450 calories
Bot: ✅ Logged 450 calories
     📊 Today's total: 450 cal
```

### Food Description (AI Estimation)
```
You: 100g grilled chicken breast
Bot: ✅ Estimated ~165 calories for "100g grilled chicken breast"
     💡 Grilled chicken breast is lean protein, approximately 165 cal per 100g
     📊 Today's total: 615 cal
```

### Daily Summary
```
You: today
Bot: 📊 Today's total: 615 calories
     Entries: 2

     Details:
     • 450 cal - Direct entry
     • 165 cal - 100g grilled chicken breast 🤖
```

### Weekly Summary
```
You: week
Bot: 📊 This week's total: 4,320 calories
     Entries: 15
     Average per day: 617 cal

     Daily breakdown:
     • Mon, Jan 8: 615 cal (2 entries)
     • Tue, Jan 9: 720 cal (3 entries)
     ...
```

### Help Command
```
You: help
Bot: 🤖 Calorie Tracker Help

     Track calories:
     • Send direct: "450 calories"
     • Describe food: "2 slices pizza"
     • Include weight: "100g chicken breast"

     Check totals:
     • "today" - Today's total
     • "week" - This week's total

     Commands:
     • "help" - Show this message

     Just text me what you ate, and I'll track it for you!
```

## Project Structure

```
fitness-chatbot/
├── prisma/
│   ├── schema.prisma              # Database schema
│   └── migrations/                # Database migrations
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── webhook/          # Telegram webhook handler
│   │   │   ├── telegram/setup/   # Webhook setup endpoint
│   │   │   └── test/             # Testing endpoint
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   └── ui/                   # shadcn/ui components
│   ├── lib/
│   │   ├── prisma.ts             # Prisma client
│   │   ├── telegram.ts           # Telegram bot client
│   │   ├── claude.ts             # Claude API client
│   │   ├── db/                   # Database operations
│   │   └── services/             # Business logic
│   └── types/
│       └── index.ts
├── .env.local                    # Environment variables
├── .env.example                  # Example environment file
├── PLAN.md                       # Implementation plan
└── README.md                     # This file
```

## Database Schema

### users
```sql
id              UUID PRIMARY KEY
phone_number    VARCHAR(20) UNIQUE  -- Stores Telegram chat ID
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

### calorie_entries
```sql
id                UUID PRIMARY KEY
user_id           UUID REFERENCES users(id)
calories          DECIMAL(10, 2)
food_description  TEXT
estimated_by_ai   BOOLEAN
entry_date        DATE
entry_time        TIMESTAMP
created_at        TIMESTAMP
```

### conversation_logs (optional)
```sql
id             UUID PRIMARY KEY
phone_number   VARCHAR(20)  -- Stores Telegram chat ID
message_type   VARCHAR(20)
message_body   TEXT
created_at     TIMESTAMP
```

## API Endpoints

### POST /api/webhook
Main webhook endpoint for Telegram updates.

**Request (from Telegram):**
```json
{
  "update_id": 123456789,
  "message": {
    "message_id": 1,
    "from": { "id": 123456789, "first_name": "User" },
    "chat": { "id": 123456789, "type": "private" },
    "date": 1641024000,
    "text": "450 calories"
  }
}
```

### POST /api/telegram/setup
Set Telegram webhook URL.

**Request:**
```json
{
  "webhookUrl": "https://your-domain.com/api/webhook"
}
```

### GET /api/telegram/setup
Get current webhook info.

### DELETE /api/telegram/setup
Remove webhook.

### POST /api/test
Test endpoint for local development.

**Request:**
```json
{
  "chatId": 123456789,
  "message": "450 calories"
}
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project on [vercel.com](https://vercel.com)
3. Add environment variables:
   - `DATABASE_URL` (use Supabase connection string for production)
   - `TELEGRAM_BOT_TOKEN`
   - `ANTHROPIC_API_KEY`
4. Deploy
5. Set webhook to production URL:

```bash
curl -X POST https://your-app.vercel.app/api/telegram/setup \
  -H "Content-Type: application/json" \
  -d '{"webhookUrl": "https://your-app.vercel.app/api/webhook"}'
```

## Troubleshooting

### Build Errors

```bash
npm run build
```

### Database Issues

Reset database:
```bash
npx prisma migrate reset
npx prisma migrate dev
```

View database with Prisma Studio:
```bash
npx prisma studio
```

### Webhook Issues

Check webhook status:
```bash
curl http://localhost:3000/api/telegram/setup
```

Delete webhook:
```bash
curl -X DELETE http://localhost:3000/api/telegram/setup
```

### Common Issues

- **Messages not received**: Check webhook is set correctly
- **Database errors**: Ensure migrations have been run
- **AI estimation not working**: Verify Anthropic API key is valid
- **Bot not responding**: Check server logs for errors

## Future Enhancements

- [ ] User goal setting (daily calorie targets)
- [ ] Meal categorization (breakfast, lunch, dinner)
- [ ] Weekly automated reports
- [ ] Macro tracking (protein, carbs, fats)
- [ ] Analytics dashboard (using shadcn/ui)
- [ ] Multi-language support
- [ ] Image recognition for food photos
- [ ] Export data to CSV/PDF
- [ ] Voice message support

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.

---

Built with Next.js, Prisma, Telegram Bot API, and Claude AI
