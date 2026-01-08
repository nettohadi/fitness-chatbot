# WhatsApp Calorie Tracker Bot 🤖

A WhatsApp chatbot that helps you track your daily calorie intake using AI-powered food recognition. Built with Next.js, Supabase, Twilio, and Anthropic Claude.

## Features

- **Direct Calorie Logging**: Send "450 calories" to log calories directly
- **AI-Powered Estimation**: Describe your food like "100g chicken breast" and let Claude AI estimate the calories
- **Daily & Weekly Summaries**: Check your progress with "today" or "week" commands
- **Automatic User Management**: Users are automatically created based on their WhatsApp phone number
- **Real-time Tracking**: All entries are stored in PostgreSQL via Supabase

## Tech Stack

- **Framework**: Next.js 15 (App Router) with TypeScript
- **Database**: PostgreSQL (Supabase)
- **WhatsApp Integration**: Twilio WhatsApp API
- **AI**: Anthropic Claude API
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (for future dashboard features)
- **Validation**: Zod

## Prerequisites

Before you begin, ensure you have:

1. **Node.js** 18+ installed
2. **Supabase Account** (free tier works)
3. **Twilio Account** with WhatsApp enabled
4. **Anthropic API Key** for Claude access
5. **ngrok** (for local development testing)

## Getting Started

### 1. Clone and Install

```bash
# Install dependencies
npm install
```

### 2. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Twilio
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Anthropic Claude
ANTHROPIC_API_KEY=your_claude_api_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Set Up Supabase Database

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor
3. Run the migration file: `supabase/migrations/001_initial_schema.sql`

Alternatively, if you have Supabase CLI installed:

```bash
# Initialize Supabase (if not already done)
npx supabase init

# Link to your project
npx supabase link --project-ref your-project-ref

# Push migrations
npx supabase db push
```

### 4. Set Up Twilio WhatsApp

1. Sign up at [twilio.com](https://www.twilio.com)
2. Get a Twilio WhatsApp number or use the sandbox
3. Configure the webhook URL (we'll do this after starting the server)

### 5. Get Anthropic API Key

1. Sign up at [anthropic.com](https://www.anthropic.com)
2. Generate an API key from the console
3. Add it to your `.env.local` file

### 6. Run the Development Server

```bash
npm run dev
```

The server will start at [http://localhost:3000](http://localhost:3000)

### 7. Expose Local Server with ngrok

In a new terminal:

```bash
ngrok http 3000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

### 8. Configure Twilio Webhook

1. Go to your Twilio Console
2. Navigate to Messaging → Settings → WhatsApp sandbox settings
3. Set the "When a message comes in" webhook to: `https://your-ngrok-url.ngrok.io/api/webhook`
4. Save the configuration

## Usage

### Send Messages via WhatsApp

Join your Twilio WhatsApp sandbox and start sending messages:

#### Examples

**Get Help:**
```
help
```

**Log Direct Calories:**
```
450 calories
320 cal
150.5 kcal
```

**Describe Food (AI Estimation):**
```
100g grilled chicken breast
2 slices of pizza
1 bowl of rice with chicken
medium apple
```

**Check Today's Total:**
```
today
total today
```

**Check This Week's Total:**
```
week
this week
weekly total
```

## API Endpoints

### POST /api/webhook

Main webhook endpoint for Twilio WhatsApp messages.

**Request (from Twilio):**
- Content-Type: `application/x-www-form-urlencoded`
- Body: Twilio webhook payload

**Response:**
- Status: 200 OK

### POST /api/test

Test endpoint for local development (simulates Twilio webhook).

**Request:**
```json
{
  "phoneNumber": "+1234567890",
  "message": "450 calories"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Test message sent successfully",
  "phoneNumber": "+1234567890",
  "messageBody": "450 calories"
}
```

**Test with curl:**
```bash
curl -X POST http://localhost:3000/api/test \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890", "message": "help"}'
```

## Project Structure

```
fitness-chatbot/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── webhook/route.ts      # Main webhook handler
│   │   │   └── test/route.ts         # Test endpoint
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # Landing page
│   │   └── globals.css
│   ├── components/
│   │   └── ui/                       # shadcn/ui components
│   ├── lib/
│   │   ├── supabase.ts               # Supabase client
│   │   ├── twilio.ts                 # Twilio client
│   │   ├── claude.ts                 # Claude API client
│   │   ├── utils.ts                  # Utility functions
│   │   ├── db/
│   │   │   ├── users.ts              # User operations
│   │   │   └── calories.ts           # Calorie operations
│   │   └── services/
│   │       ├── messageParser.ts      # Message classification
│   │       ├── calorieEstimator.ts   # AI calorie estimation
│   │       └── responseGenerator.ts  # Response formatting
│   └── types/
│       └── index.ts                  # TypeScript types
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql    # Database schema
├── PLAN.md                           # Implementation plan
└── README.md                         # This file
```

## Database Schema

### users
```sql
id              UUID PRIMARY KEY
phone_number    VARCHAR(20) UNIQUE
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
phone_number   VARCHAR(20)
message_type   VARCHAR(20)
message_body   TEXT
created_at     TIMESTAMP
```

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the project to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy
5. Update Twilio webhook URL to your Vercel domain

```bash
# Or use Vercel CLI
vercel
```

### Update Twilio Webhook

After deployment, update your Twilio webhook URL to:
```
https://your-app.vercel.app/api/webhook
```

## Testing

### Local Testing with Test Endpoint

```bash
# Test help command
curl -X POST http://localhost:3000/api/test \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890", "message": "help"}'

# Test direct calorie entry
curl -X POST http://localhost:3000/api/test \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890", "message": "450 calories"}'

# Test AI estimation
curl -X POST http://localhost:3000/api/test \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890", "message": "100g chicken breast"}'

# Test daily summary
curl -X POST http://localhost:3000/api/test \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890", "message": "today"}'
```

### Integration Testing with WhatsApp

1. Start the development server
2. Run ngrok to expose your local server
3. Configure Twilio webhook to ngrok URL
4. Send test messages from WhatsApp
5. Verify responses and check Supabase database

## Troubleshooting

### Messages not received

- Check ngrok is running and webhook URL is correct in Twilio
- Verify all environment variables are set
- Check Twilio console for webhook errors

### Database errors

- Ensure migrations have been run
- Verify Supabase connection string is correct
- Check Row Level Security policies in Supabase

### AI estimation not working

- Verify Anthropic API key is valid
- Check Claude API rate limits
- Look at server logs for error details

### Twilio webhook validation fails

- Ensure you're using the correct auth token
- Check that the webhook URL matches exactly
- Verify request is coming from Twilio

## Future Enhancements

- [ ] User goal setting (daily calorie targets)
- [ ] Meal categorization (breakfast, lunch, dinner)
- [ ] Weekly automated reports
- [ ] Macro tracking (protein, carbs, fats)
- [ ] Analytics dashboard (using shadcn/ui)
- [ ] Multi-language support
- [ ] Image recognition for food photos
- [ ] Export data to CSV/PDF

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.

---

Built with ❤️ using Next.js, Supabase, Twilio, and Claude AI
