#!/bin/bash

# Debug API Helper Script
# Usage: source scripts/debug-api.sh
# Or run directly: ./scripts/debug-api.sh <command> [args]

# Load environment variables from .env file
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env"

if [ -f "$ENV_FILE" ]; then
  export DEBUG_API_TOKEN=$(grep -E "^DEBUG_API_TOKEN=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
  export VERCEL_DOMAIN=$(grep -E "^VERCEL_DOMAIN=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'" | sed 's:/$::')
fi

# Validate env vars
if [ -z "$DEBUG_API_TOKEN" ] || [ -z "$VERCEL_DOMAIN" ]; then
  echo "Error: Missing DEBUG_API_TOKEN or VERCEL_DOMAIN in .env file"
  echo "Add these to your .env:"
  echo "  DEBUG_API_TOKEN=your_token"
  echo "  VERCEL_DOMAIN=https://your-app.vercel.app"
  return 1 2>/dev/null || exit 1
fi

# Base curl function
debug_api() {
  local endpoint="$1"
  curl -s -H "Authorization: Bearer $DEBUG_API_TOKEN" \
    "$VERCEL_DOMAIN/api/admin/debug?$endpoint" | jq '.'
}

# Helper functions
debug_logs() {
  local limit="${1:-5}"
  debug_api "type=logs&limit=$limit"
}

debug_messages() {
  local limit="${1:-10}"
  debug_api "type=messages&limit=$limit"
}

debug_users() {
  local limit="${1:-10}"
  debug_api "type=users&limit=$limit"
}

debug_calories() {
  local limit="${1:-10}"
  debug_api "type=calories&limit=$limit"
}

debug_exercises() {
  local limit="${1:-10}"
  debug_api "type=exercises&limit=$limit"
}

debug_full_log() {
  local log_id="$1"
  if [ -z "$log_id" ]; then
    echo "Usage: debug_full_log <log_id>"
    return 1
  fi
  debug_api "type=full-log&id=$log_id"
}

debug_user() {
  local user_id="$1"
  if [ -z "$user_id" ]; then
    echo "Usage: debug_user <user_id>"
    return 1
  fi
  debug_api "type=users&userId=$user_id"
}

debug_by_phone() {
  local phone="$1"
  local type="${2:-messages}"
  local limit="${3:-10}"
  if [ -z "$phone" ]; then
    echo "Usage: debug_by_phone <phone> [type] [limit]"
    return 1
  fi
  debug_api "type=$type&phone=$phone&limit=$limit"
}

debug_by_date() {
  local date="$1"
  local type="${2:-calories}"
  local limit="${3:-50}"
  if [ -z "$date" ]; then
    echo "Usage: debug_by_date <YYYY-MM-DD> [type] [limit]"
    return 1
  fi
  debug_api "type=$type&date=$date&limit=$limit"
}

# Show help
debug_help() {
  echo "Debug API Helper Functions"
  echo "=========================="
  echo ""
  echo "Available commands:"
  echo "  debug_logs [limit]           - Get recent LLM API logs (default: 5)"
  echo "  debug_messages [limit]       - Get recent messages (default: 10)"
  echo "  debug_users [limit]          - Get user profiles (default: 10)"
  echo "  debug_calories [limit]       - Get calorie entries (default: 10)"
  echo "  debug_exercises [limit]      - Get exercise entries (default: 10)"
  echo "  debug_full_log <id>          - Get full log by ID"
  echo "  debug_user <user_id>         - Get specific user"
  echo "  debug_by_phone <phone> [type] [limit] - Filter by phone number"
  echo "  debug_by_date <YYYY-MM-DD> [type] [limit] - Filter by date"
  echo "  debug_api <query>            - Raw API call with custom query params"
  echo ""
  echo "Environment:"
  echo "  VERCEL_DOMAIN: $VERCEL_DOMAIN"
  echo "  DEBUG_API_TOKEN: ${DEBUG_API_TOKEN:0:10}..."
}

# If run directly with arguments, execute the command
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
  case "$1" in
    logs) debug_logs "${@:2}" ;;
    messages) debug_messages "${@:2}" ;;
    users) debug_users "${@:2}" ;;
    calories) debug_calories "${@:2}" ;;
    exercises) debug_exercises "${@:2}" ;;
    full-log) debug_full_log "${@:2}" ;;
    user) debug_user "${@:2}" ;;
    by-phone) debug_by_phone "${@:2}" ;;
    by-date) debug_by_date "${@:2}" ;;
    help|--help|-h) debug_help ;;
    *)
      echo "Usage: $0 <command> [args]"
      echo "Run '$0 help' for available commands"
      ;;
  esac
else
  echo "Debug API loaded! Run 'debug_help' for available commands."
fi
