#!/usr/bin/env bash
# Register Gylio with Microsoft Entra ID for Clerk's production "Sign in with
# Microsoft" (personal Microsoft accounts and work/school accounts).
# Development instances don't need this: Clerk's shared credentials work there.
#
#   CLERK_MICROSOFT_REDIRECT_URI=<copied from Clerk → SSO connections → Microsoft> scripts/setup/entra-app.sh
source "$(dirname "$0")/lib.sh"

require_cmd az "brew install azure-cli && az login --allow-no-subscriptions"
require_var CLERK_MICROSOFT_REDIRECT_URI "Clerk dashboard → SSO connections → Microsoft → Use custom credentials → Authorized redirect URI"

NAME="${ENTRA_APP_NAME:-Gylio}"
if [[ "${DRY_RUN:-0}" == "1" ]]; then
  APP_ID="00000000-0000-0000-0000-000000000000"
  run az ad app create --display-name "$NAME" --sign-in-audience AzureADandPersonalMicrosoftAccount --web-redirect-uris "$CLERK_MICROSOFT_REDIRECT_URI"
else
  APP_ID="$(az ad app list --display-name "$NAME" --query '[0].appId' -o tsv)"
  if [[ -z "$APP_ID" ]]; then
    APP_ID="$(az ad app create --display-name "$NAME" --sign-in-audience AzureADandPersonalMicrosoftAccount \
      --web-redirect-uris "$CLERK_MICROSOFT_REDIRECT_URI" --query appId -o tsv)"
  else
    az ad app update --id "$APP_ID" --web-redirect-uris "$CLERK_MICROSOFT_REDIRECT_URI"
  fi
fi

echo "Client ID (paste into Clerk → Microsoft → Client ID): $APP_ID"
echo "Creating a client secret valid for 2 years. It is shown once: paste it into Clerk, then clear the terminal."
run az ad app credential reset --id "$APP_ID" --display-name clerk --years 2 --query password -o tsv
echo "Then tick 'Enable for sign-up and sign-in' in Clerk and run: node scripts/setup/check-auth.mjs --require google,microsoft"
