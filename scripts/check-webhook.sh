#!/bin/bash

# Script to check Telegram webhook status
# Usage: ./scripts/check-webhook.sh

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

echo "🔍 Checking webhook info..."
echo ""

RESPONSE=$(curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo")

echo "$RESPONSE" | jq '.'

# Extract webhook URL
WEBHOOK_URL=$(echo "$RESPONSE" | jq -r '.result.url')

echo ""
if [ "$WEBHOOK_URL" = "null" ] || [ -z "$WEBHOOK_URL" ]; then
    echo "⚠️  No webhook is currently set"
else
    echo "✅ Webhook is set to: $WEBHOOK_URL"

    # Check pending updates
    PENDING=$(echo "$RESPONSE" | jq -r '.result.pending_update_count')
    if [ "$PENDING" -gt 0 ]; then
        echo "⚠️  Pending updates: $PENDING"
    else
        echo "✅ No pending updates"
    fi
fi
