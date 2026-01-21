# Fitness Chatbot Project Instructions

## Debug API

When debugging bot issues, use the Debug API to fetch logs from production.

### Environment Variables (from .env)
- `DEBUG_API_TOKEN`: dbg_fitness_2026_xK9mP3nQ7wL5vR8t
- `VERCEL_DOMAIN`: https://fitness-chatbot-rosy.vercel.app/

### Common Commands

```bash
# Recent API logs (last 5)
curl -s -H "Authorization: Bearer dbg_fitness_2026_xK9mP3nQ7wL5vR8t" \
  "https://fitness-chatbot-rosy.vercel.app/api/admin/debug?type=logs&limit=5" | jq '.'

# Get full log by ID
curl -s -H "Authorization: Bearer dbg_fitness_2026_xK9mP3nQ7wL5vR8t" \
  "https://fitness-chatbot-rosy.vercel.app/api/admin/debug?type=full-log&id=LOG_ID" | jq '.'

# Recent messages
curl -s -H "Authorization: Bearer dbg_fitness_2026_xK9mP3nQ7wL5vR8t" \
  "https://fitness-chatbot-rosy.vercel.app/api/admin/debug?type=messages&limit=10" | jq '.'

# Calorie entries
curl -s -H "Authorization: Bearer dbg_fitness_2026_xK9mP3nQ7wL5vR8t" \
  "https://fitness-chatbot-rosy.vercel.app/api/admin/debug?type=calories&limit=10" | jq '.'
```

### Available Types
- `logs` - LLM API call logs (default)
- `messages` - WhatsApp conversation logs
- `users` - User profiles
- `full-log` - Full log content by ID
- `calories` - Calorie entries
- `exercises` - Exercise entries

### Query Parameters
- `limit` - Max results (default 10, max 50)
- `userId` - Filter by user ID
- `phone` - Filter by phone number
- `from` / `to` - ISO date range filter
- `date` - YYYY-MM-DD for specific day

See `docs/DEBUG_API.md` for full documentation.
