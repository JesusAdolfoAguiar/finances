#!/bin/bash

if [ -z "$1" ]; then
  echo "Error: Please provide your bot token."
  echo "Usage: ./set_webhook.sh <BOT_TOKEN>"
  exit 1
fi

TOKEN=$1
WEB_APP_URL="https://script.google.com/macros/s/AKfycbzeLT04hlBC3Ka6w09fN0dXhXRXGywm2cIIXE06dC0v-I5SWwZcfS2nGhRE0GiS179_DA/exec"
TELEGRAM_URL="https://api.telegram.org/bot${TOKEN}/setWebhook"

echo "Setting webhook for bot..."
curl -F "url=$WEB_APP_URL" "$TELEGRAM_URL"
echo ""
