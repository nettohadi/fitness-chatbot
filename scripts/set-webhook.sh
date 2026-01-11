#!/bin/bash

# Script to set Telegram webhook
# Usage: ./scripts/set-webhook.sh <WEBHOOK_URL>
# Example: ./scripts/set-webhook.sh https://your-project.vercel.app/api/webhook

# Check if webhook URL is provided
if [ -z "$1" ]; then
    echo "❌ Error: Webhook URL is required"
    echo "Usage: ./scripts/set-webhook.sh <WEBHOOK_URL>"
    echo "Example: ./scripts/set-webhook.sh https://your-project.vercel.app/api/webhook"
    exit 1
fi

WEBHOOK_URL=$1

# Load TELEGRAM_BOT_TOKEN from .env if available
if [ -f .env.local ]; then
    export $(cat .env.local | grep TELEGRAM_BOT_TOKEN | xargs)
fi

# Check if TELEGRAM_BOT_TOKEN is set
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo "❌ Error: TELEGRAM_BOT_TOKEN not found"
    echo "Either set it in .env file or export it as environment variable"
    exit 1
fi

echo "🔄 Setting webhook to: $WEBHOOK_URL"
echo ""

# Set the webhook
RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"${WEBHOOK_URL}\",
    \"allowed_updates\": [\"message\"]
  }")

echo "$RESPONSE" | jq '.'

# Check if successful
if echo "$RESPONSE" | jq -e '.ok == true' > /dev/null; then
    echo ""
    echo "✅ Webhook set successfully!"
    echo ""
    echo "Verifying webhook info..."
    curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo" | jq '.'
else
    echo ""
    echo "❌ Failed to set webhook"
    exit 1
fi
