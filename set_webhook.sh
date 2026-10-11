#!/bin/bash

if [ -z "$1" ]; then
  echo "Error: Please provide your bot token."
  echo "Usage: ./set_webhook.sh <BOT_TOKEN>"
  exit 1
fi

TOKEN=$1
WEB_APP_URL="https://script.google.com/macros/s/AKfycbxNEGK9F_qF5gm2Iz-YR1N4F99Wg9CqUg7xNBCGCr0epFnws4WE4O1QkERP8MTAv7_9uQ/exec"
TELEGRAM_URL="https://api.telegram.org/bot${TOKEN}/setWebhook"

echo "Setting webhook for bot..."
curl -F "url=$WEB_APP_URL" "$TELEGRAM_URL"
echo ""
