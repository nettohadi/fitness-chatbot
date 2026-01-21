# Debug API Endpoint

The debug API endpoint allows you to inspect LLM logs, conversation history, and user data for debugging purposes.

## Authentication

All requests require a Bearer token in the Authorization header:

```
Authorization: Bearer YOUR_DEBUG_API_TOKEN
```

The token is configured via the `DEBUG_API_TOKEN` environment variable.

## Base URL

Use VERCEL_DOMAIN in env file as base url.

```
GET /api/admin/debug
```

## Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | Data type to fetch (see below) |
| `limit` | number | Max results (default: 10, max: 50) |
| `userId` | string | Filter by user ID |
| `phone` | string | Filter by phone number (partial match) |
| `from` | ISO date | Filter from this date/time |
| `to` | ISO date | Filter until this date/time |
| `date` | YYYY-MM-DD | Shorthand for a specific day |

## Data Types

### `logs` (default)
Get LLM API call logs with prompts and responses.

```bash
# Recent logs
curl -H "Authorization: Bearer $DEBUG_API_TOKEN" \
  "http://localhost:3000/api/admin/debug?type=logs&limit=5"

# Logs for specific user
curl -H "Authorization: Bearer $DEBUG_API_TOKEN" \
  "http://localhost:3000/api/admin/debug?type=logs&userId=USER_ID"

# Logs within time range
curl -H "Authorization: Bearer $DEBUG_API_TOKEN" \
  "http://localhost:3000/api/admin/debug?type=logs&from=2026-01-20T21:00:00&to=2026-01-20T22:00:00"
```

### `messages`
Get conversation logs (incoming/outgoing WhatsApp messages).

```bash
# Recent messages for a phone number
curl -H "Authorization: Bearer $DEBUG_API_TOKEN" \
  "http://localhost:3000/api/admin/debug?type=messages&phone=628123456789&limit=20"

# Messages on a specific date
curl -H "Authorization: Bearer $DEBUG_API_TOKEN" \
  "http://localhost:3000/api/admin/debug?type=messages&phone=628123456789&date=2026-01-20"
```

### `users`
Get user profiles.

```bash
# Find user by phone
curl -H "Authorization: Bearer $DEBUG_API_TOKEN" \
  "http://localhost:3000/api/admin/debug?type=users&phone=628123456789"

# All recent users
curl -H "Authorization: Bearer $DEBUG_API_TOKEN" \
  "http://localhost:3000/api/admin/debug?type=users&limit=10"
```

### `full-log`
Get full content of a specific LLM log (not truncated).

```bash
curl -H "Authorization: Bearer $DEBUG_API_TOKEN" \
  "http://localhost:3000/api/admin/debug?type=full-log&id=LOG_ID"
```

### `calories`
Get calorie entries with timezone debug info.

```bash
curl -H "Authorization: Bearer $DEBUG_API_TOKEN" \
  "http://localhost:3000/api/admin/debug?type=calories&phone=628123456789&limit=10"
```

### `exercises`
Get exercise entries with timezone debug info.

```bash
curl -H "Authorization: Bearer $DEBUG_API_TOKEN" \
  "http://localhost:3000/api/admin/debug?type=exercises&phone=628123456789&limit=10"
```

## Common Debug Scenarios

### Debug a specific conversation

1. Find the user:
```bash
curl -H "Authorization: Bearer $DEBUG_API_TOKEN" \
  "http://localhost:3000/api/admin/debug?type=users&phone=628123456789"
```

2. Get their recent messages:
```bash
curl -H "Authorization: Bearer $DEBUG_API_TOKEN" \
  "http://localhost:3000/api/admin/debug?type=messages&phone=628123456789&limit=20"
```

3. Get LLM logs for that time period:
```bash
curl -H "Authorization: Bearer $DEBUG_API_TOKEN" \
  "http://localhost:3000/api/admin/debug?type=logs&userId=USER_ID&from=2026-01-20T21:20:00&to=2026-01-20T21:30:00"
```

4. Get full log content if needed:
```bash
curl -H "Authorization: Bearer $DEBUG_API_TOKEN" \
  "http://localhost:3000/api/admin/debug?type=full-log&id=LOG_ID"
```

### Debug why bot refused to answer

1. Get logs around the time of the issue:
```bash
curl -H "Authorization: Bearer $DEBUG_API_TOKEN" \
  "http://localhost:3000/api/admin/debug?type=logs&from=2026-01-20T21:23:00&to=2026-01-20T21:25:00"
```

2. Check the `systemPrompt` and `response` fields to see:
   - What intent was detected
   - What prompt was used
   - What the LLM responded with

### Debug calorie/exercise entries

```bash
# Check entries for a specific date
curl -H "Authorization: Bearer $DEBUG_API_TOKEN" \
  "http://localhost:3000/api/admin/debug?type=calories&phone=628123456789&date=2026-01-20"
```

The response includes `serverTime` to help debug timezone issues.

## Environment Setup

Add to your `.env` file:

```
DEBUG_API_TOKEN=your-secret-token-here
```

Generate a secure token:
```bash
openssl rand -hex 32
```
