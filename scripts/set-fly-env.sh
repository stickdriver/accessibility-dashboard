#!/bin/bash

# Script to set environment variables for Fly.io deployment
# Usage: ./scripts/set-fly-env.sh

echo "Setting environment variables for Fly.io deployment..."

# Required environment variables - UPDATE THESE WITH YOUR ACTUAL VALUES
flyctl secrets set \
  NEXT_PUBLIC_CONVEX_URL="https://dusty-guanaco-345.convex.cloud" \
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_c3RpcnJlZC1hbnQtNzAuY2xlcmsuYWNjb3VudHMuZGV2JA" \
  CLERK_SECRET_KEY="sk_test_0p6CA5OUlimE6pcQpfkFbik15XXHofPRtRdsqyY0jX" \
  NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in" \
  NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up" \
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard" \
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/dashboard" \
  NEXT_PUBLIC_APP_URL="https://accessibility-dashboard.fly.dev" \
  NODE_ENV="production" \
  LOG_LEVEL="info"

echo "Environment variables set successfully!"
echo "The app will restart automatically with the new configuration."