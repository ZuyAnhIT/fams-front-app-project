#!/bin/sh
set -e

# EXPO_TOKEN and MAPS_KEY are passed in via docker -e flags
echo "==> Whoami"
eas whoami

echo "==> Setting EXPO_ANDROID_GOOGLE_MAPS_API_KEY for development environment"
# Try create, if already exists update it
if ! eas env:create \
    --environment development \
    --name EXPO_ANDROID_GOOGLE_MAPS_API_KEY \
    --value "$MAPS_KEY" \
    --type string \
    --visibility sensitive \
    --non-interactive 2>/dev/null; then
  echo "    Already exists — updating..."
  eas env:update \
    --environment development \
    --name EXPO_ANDROID_GOOGLE_MAPS_API_KEY \
    --value "$MAPS_KEY" \
    --non-interactive
fi

echo "==> Triggering cloud build: android / development"
eas build \
  --platform android \
  --profile development \
  --non-interactive \
  --no-wait
