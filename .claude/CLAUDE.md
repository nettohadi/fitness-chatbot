# Fitness Chatbot Project Instructions

## Debug API

When debugging bot issues, use the Debug API to fetch logs from production.

### Quick Start (Recommended)

Use the helper script that auto-loads env vars:

```bash
# Source the script to get helper functions
source scripts/debug-api.sh

# Then use these commands:
debug_logs 5          # Recent API logs
debug_messages 10     # Recent messages
debug_calories 10     # Calorie entries
debug_exercises 10    # Exercise entries
debug_users 10        # User profiles
debug_full_log <id>   # Full log by ID
debug_by_phone <phone> [type] [limit]  # Filter by phone
debug_by_date <YYYY-MM-DD> [type] [limit]  # Filter by date
debug_help            # Show all commands
```

Or run directly:
```bash
./scripts/debug-api.sh logs 5
./scripts/debug-api.sh messages 10
./scripts/debug-api.sh help
```

### Environment Variables
Add these to your `.env` file:
- `DEBUG_API_TOKEN` - Authorization token for debug API
- `VERCEL_DOMAIN` - Production domain (e.g., https://fitness-chatbot-rosy.vercel.app/)

### Manual Commands (Alternative)

```bash
# Recent API logs (last 5)
curl -s -H "Authorization: Bearer $DEBUG_API_TOKEN" \
  "$VERCEL_DOMAIN/api/admin/debug?type=logs&limit=5" | jq '.'

# Get full log by ID
curl -s -H "Authorization: Bearer $DEBUG_API_TOKEN" \
  "$VERCEL_DOMAIN/api/admin/debug?type=full-log&id=LOG_ID" | jq '.'

# Recent messages
curl -s -H "Authorization: Bearer $DEBUG_API_TOKEN" \
  "$VERCEL_DOMAIN/api/admin/debug?type=messages&limit=10" | jq '.'

# Calorie entries
curl -s -H "Authorization: Bearer $DEBUG_API_TOKEN" \
  "$VERCEL_DOMAIN/api/admin/debug?type=calories&limit=10" | jq '.'
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
