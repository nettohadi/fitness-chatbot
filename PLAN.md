# Telegram Calorie Tracking Chatbot - Implementation Plan

## Overview
Build a Telegram chatbot that tracks daily calorie intake by accepting either direct calorie values or food descriptions with weights, using Claude AI to estimate calories from natural language food descriptions.

## Tech Stack
- **Frontend/Backend**: Next.js 14+ (App Router) with TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (for future dashboard features)
- **Database**: PostgreSQL (local for development, Supabase for production)
- **ORM**: Prisma with PostgreSQL adapter
- **Messaging Platform**: Telegram Bot API
- **LLM**: Anthropic Claude API (for calorie estimation)
- **User Identification**: Telegram chat ID
- **Deployment**: Vercel (recommended for Next.js)

---

## Architecture Design

### 1. Database Schema (PostgreSQL/Supabase)

#### Table: `users`
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) UNIQUE NOT NULL,  -- Telegram chat ID (stored as string)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_phone ON users(phone_number);
```

**Note**: The field is named `phone_number` for backwards compatibility but stores the Telegram chat ID.

#### Table: `calorie_entries`
```sql
CREATE TABLE calorie_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  calories DECIMAL(10, 2) NOT NULL,
  food_description TEXT,  -- Original message from user
  estimated_by_ai BOOLEAN DEFAULT FALSE,  -- True if calories estimated by Claude
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  entry_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_calorie_entries_user_date ON calorie_entries(user_id, entry_date);
CREATE INDEX idx_calorie_entries_created ON calorie_entries(created_at);
```

#### Table: `conversation_logs` (optional, for debugging)
```sql
CREATE TABLE conversation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) NOT NULL,
  message_type VARCHAR(20),  -- 'incoming' or 'outgoing'
  message_body TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### 2. Project Structure

```
fitness-chatbot/
├── .env.local                    # Local environment variables
├── .env.example                  # Example env file
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── components.json               # shadcn/ui config
├── prisma/
│   ├── schema.prisma              # Prisma schema
│   └── migrations/                # Database migrations
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── webhook/
│   │   │   │   └── route.ts           # Telegram webhook handler
│   │   │   ├── telegram/
│   │   │   │   └── setup/
│   │   │   │       └── route.ts       # Telegram webhook setup endpoint
│   │   │   └── test/
│   │   │       └── route.ts           # Testing endpoint
│   │   ├── layout.tsx
│   │   └── page.tsx                   # Simple landing page
│   ├── components/
│   │   └── ui/                        # shadcn/ui components
│   ├── lib/
│   │   ├── utils.ts                   # shadcn/ui utils
│   │   ├── prisma.ts                  # Prisma client setup
│   │   ├── telegram.ts                # Telegram bot client setup
│   │   ├── claude.ts                  # Claude API client
│   │   ├── db/
│   │   │   ├── users.ts               # User database operations
│   │   │   └── calories.ts            # Calorie entry operations
│   │   └── services/
│   │       ├── messageParser.ts       # Parse incoming messages
│   │       ├── calorieEstimator.ts    # Claude API integration for estimation
│   │       └── responseGenerator.ts   # Generate Telegram responses
│   └── types/
│       └── index.ts                   # TypeScript types
├── PLAN.md                            # This file
└── README.md
```

---

### 3. Message Processing Workflow

```
1. User sends Telegram message
   ↓
2. Telegram sends update to webhook (POST /api/webhook)
   ↓
3. Webhook handler processes Telegram update
   ↓
4. Parse message to determine type:
   - Direct calorie? (regex: numbers + "cal", "kcal", "calories")
   - Food description? (anything else)
   - Query command? ("total", "today", "week", "help")
   ↓
5a. If direct calorie:
    → Extract number → Save to DB → Send confirmation
   ↓
5b. If food description:
    → Send to Claude API with prompt
    → Parse structured response (calories, confidence)
    → Save to DB with estimated_by_ai=true
    → Send confirmation with estimate
   ↓
5c. If query:
    → Query DB for user's entries
    → Calculate totals
    → Send summary
   ↓
6. Send response via Telegram → User receives Telegram message
```

---

### 4. Core Implementation Details

#### A. Telegram Webhook Handler (`src/app/api/webhook/route.ts`)
```typescript
// Handles incoming Telegram messages
- Parse JSON update from Telegram
- Extract: chat.id, message.text
- Create/find user by chat ID
- Route to appropriate handler based on message type
- Send response back via Telegram Bot API
```

#### B. Message Parser (`src/lib/services/messageParser.ts`)
```typescript
// Classify message type
- Regex patterns for direct calorie input
- Detection for query commands
- Default to food description
```

**Patterns:**
- Direct calorie: `/(\d+(?:\.\d+)?)\s*(cal|kcal|calories?)/i`
- Examples: "450 calories", "320 cal", "150.5 kcal"

#### C. Calorie Estimator (`src/lib/services/calorieEstimator.ts`)
```typescript
// Claude API integration
- Send structured prompt with food description
- Request JSON response: { calories: number, confidence: string, reasoning: string }
- Handle API errors gracefully
- Return estimated calories
```

**Claude Prompt Template:**
```
You are a nutrition expert. Estimate the calories for this food item:

"{user_message}"

Respond with ONLY a JSON object in this exact format:
{
  "calories": <number>,
  "confidence": "high|medium|low",
  "reasoning": "<brief explanation>"
}

If you cannot determine calories, set calories to 0 and explain why in reasoning.
```

#### D. Database Operations
- `lib/db/users.ts`: `findOrCreateUser(phoneNumber)`
- `lib/db/calories.ts`:
  - `addCalorieEntry(userId, calories, description, isAiEstimated)`
  - `getDailyTotal(userId, date)`
  - `getWeeklyTotal(userId, startDate)`

---

### 5. Required Environment Variables

```env
# Database (Prisma)
DATABASE_URL=postgresql://user@localhost:5432/fitness_chatbot

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# Anthropic Claude
ANTHROPIC_API_KEY=your_claude_api_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Change to production URL
```

---

### 6. Required NPM Packages

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@prisma/client": "^6.0.0",
    "@prisma/adapter-pg": "^6.0.0",
    "pg": "^8.11.0",
    "node-telegram-bot-api": "^0.66.0",
    "@anthropic-ai/sdk": "^0.10.0",
    "zod": "^3.22.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "lucide-react": "^0.300.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "@types/node-telegram-bot-api": "^0.64.0",
    "prisma": "^6.0.0",
    "typescript": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "^15.0.0"
  }
}
```

---

### 7. Example Conversation Flows

#### Flow 1: Direct Calorie Input
```
User: "450 calories"
Bot: "✅ Logged 450 calories. Your total today: 1,250 cal"
```

#### Flow 2: Food Description
```
User: "100g grilled chicken breast"
Bot: "✅ Estimated ~165 calories for 100g grilled chicken breast.
     Your total today: 1,415 cal"
```

#### Flow 3: Query Daily Total
```
User: "total today"
Bot: "📊 Today's total: 1,415 calories
     Entries: 3

     Details:
     • 450 cal - Direct entry
     • 800 cal - 2 eggs and toast
     • 165 cal - 100g chicken breast"
```

#### Flow 4: Help Command
```
User: "help"
Bot: "🤖 Calorie Tracker Help

     Track calories:
     • Send direct: '450 calories'
     • Describe food: '2 slices pizza'

     Check totals:
     • 'today' - Today's total
     • 'week' - This week's total

     Commands:
     • 'help' - Show this message"
```

---

### 8. Security & Validation Considerations

1. **Webhook Security**: Optionally verify webhook requests using secret token
2. **Rate Limiting**: Prevent spam/abuse (use Next.js middleware or Vercel rate limiting)
3. **Input Sanitization**: Clean user messages before storing
4. **Claude API Safeguards**:
   - Set max tokens limit
   - Timeout for API calls
   - Fallback if API fails
5. **Database Security**: Use Supabase Row Level Security (RLS)
6. **Environment Variables**: Never commit `.env.local` to git

---

## Implementation Steps

### Phase 1: Project Setup
1. ✅ Initialize Next.js project with TypeScript and Tailwind CSS
2. ✅ Set up shadcn/ui
3. Install required dependencies
4. Set up Supabase project (remote) and local PostgreSQL
5. Create database schema and run migrations
6. Configure environment variables

### Phase 2: Database Layer
1. Set up Supabase client (`src/lib/supabase.ts`)
2. Implement user database operations (`src/lib/db/users.ts`)
3. Implement calorie entry operations (`src/lib/db/calories.ts`)
4. Test database operations locally

### Phase 3: External Service Integration
1. Set up Telegram bot client (`src/lib/telegram.ts`)
2. Set up Claude API client (`src/lib/claude.ts`)
3. Create Telegram bot via @BotFather
4. Test Claude API with sample prompts

### Phase 4: Core Business Logic
1. Implement message parser (`src/lib/services/messageParser.ts`)
2. Implement calorie estimator with Claude (`src/lib/services/calorieEstimator.ts`)
3. Implement response generator (`src/lib/services/responseGenerator.ts`)
4. Create TypeScript types (`src/types/index.ts`)

### Phase 5: Webhook Handler
1. Create webhook API route (`src/app/api/webhook/route.ts`)
2. Parse Telegram updates (JSON)
3. Integrate message parser and routing logic
4. Implement response sending via Telegram Bot API
5. Add error handling and logging

### Phase 6: Query Features
1. Implement "today" command handler
2. Implement "week" command handler
3. Implement "help" command handler
4. Format responses with emojis and structure

### Phase 7: Testing & Deployment
1. Create test endpoint for local testing
2. Use ngrok to expose local webhook for Telegram
3. Set webhook URL using Telegram Bot API
4. Test end-to-end flows with real Telegram messages
5. Deploy to Vercel
6. Configure Telegram webhook to production URL
7. Final testing in production

---

## Verification & Testing Plan

### Local Development Testing
1. **Database Tests**:
   - Connect to local PostgreSQL
   - Create test user
   - Add calorie entries
   - Query daily/weekly totals

2. **Claude API Tests**:
   - Test with various food descriptions
   - Verify JSON response parsing
   - Test edge cases (invalid foods, ambiguous descriptions)

3. **Message Parser Tests**:
   - Test direct calorie patterns
   - Test command detection
   - Test food description defaults

### Integration Testing (with ngrok)
1. Expose local webhook using ngrok: `ngrok http 3000`
2. Set Telegram webhook to ngrok URL using `/api/telegram/setup`
3. Send test messages from Telegram:
   - "450 calories"
   - "100g chicken breast"
   - "today"
   - "help"
4. Verify responses received in Telegram
5. Check database entries in local PostgreSQL

### Production Testing
1. Deploy to Vercel
2. Update Telegram webhook to production URL
3. Test all conversation flows
4. Monitor logs for errors
5. Verify database updates

### End-to-End Test Scenario
```
1. Send: "help" → Verify help message received
2. Send: "300 calories" → Verify logged + total shown
3. Send: "2 slices of pizza" → Verify AI estimate + logged
4. Send: "today" → Verify total shows both entries
5. Check database → Verify 2 entries in calorie_entries table
```

---

## Critical Files to Create

1. **Prisma Schema**: `prisma/schema.prisma`
2. **Migrations**: `prisma/migrations/`
3. **Webhook Handler**: `src/app/api/webhook/route.ts`
4. **Database Clients**: `src/lib/prisma.ts`, `src/lib/db/users.ts`, `src/lib/db/calories.ts`
5. **Service Integrations**: `src/lib/telegram.ts`, `src/lib/claude.ts`
6. **Business Logic**: `src/lib/services/messageParser.ts`, `src/lib/services/calorieEstimator.ts`, `src/lib/services/responseGenerator.ts`
7. **Configuration**: `.env.example`, `next.config.ts`, `tsconfig.json`
8. **Documentation**: `README.md`

---

## Recommended Additions (Optional - Future Features)

1. **Analytics Dashboard**: Next.js page showing user stats (use shadcn/ui components)
2. **User Goals**: Allow users to set daily calorie goals
3. **Meal Tracking**: Categorize entries by meal (breakfast, lunch, dinner)
4. **Weekly Reports**: Send automated weekly summaries
5. **Nutrition Details**: Track macros (protein, carbs, fats) using Claude
6. **Multi-language Support**: Support multiple languages
7. **Image Recognition**: Allow users to send food photos (future enhancement)

---

## Notes & Recommendations

- **Start Simple**: Build MVP with direct calories + AI estimation first
- **Incremental Development**: Add query features after core logging works
- **Error Handling**: Always send friendly error messages to users
- **Logging**: Log all interactions for debugging (use conversation_logs table)
- **Claude Prompt Engineering**: Iterate on prompt to improve accuracy
- **Supabase RLS**: Add Row Level Security policies to protect user data
- **Cost Management**: Monitor Claude API usage (cache common foods if needed)
- **Telegram Costs**: Telegram Bot API is completely free
- **shadcn/ui**: Already set up for future dashboard features, even though not needed immediately

---

## Quick Start Commands

```bash
# Install dependencies
npm install

# Set up shadcn/ui
npx shadcn@latest init

# Run development server
npm run dev

# Set up Supabase locally (optional)
npx supabase init
npx supabase start

# Expose local webhook for Twilio testing
ngrok http 3000

# Deploy to Vercel
vercel
```
