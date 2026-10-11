#!/bin/bash
if [ -z "$1" ]; then
  echo "Usage: ./delete_webhook.sh <BOT_TOKEN>"
  exit 1
fi
curl -s "https://api.telegram.org/bot$1/deleteWebhook?drop_pending_updates=true"
echo ""
echo "Webhook deleted and pending queue dropped."
