#!/usr/bin/env bash
# Deploy the Gylio API to Cloud Run with its secrets in Secret Manager, and put
# a budget alert on the billing account so a runaway loop can't surprise you.
# Run from the repository root on your own machine. Secrets are read with
# hidden input (or reused if they already exist) and are never printed.
#
#   GCP_PROJECT=<id> BILLING_ACCOUNT=<id> APP_ORIGIN=https://app.<domain> API_ORIGIN=https://api.<domain> scripts/setup/cloudrun.sh
source "$(dirname "$0")/lib.sh"

require_cmd gcloud "brew install --cask google-cloud-sdk && gcloud auth login"
require_var GCP_PROJECT "your Google Cloud project id"
require_var BILLING_ACCOUNT "gcloud billing accounts list"
require_var APP_ORIGIN "e.g. https://app.gylio.app (no trailing slash)"
require_var API_ORIGIN "e.g. https://api.gylio.app (no trailing slash)"

REGION="${REGION:-southamerica-west1}"  # Santiago; there is no Peru region
SERVICE="${SERVICE:-gylio-api}"
SECRETS=(MONGODB_URI CLERK_ISSUER CLERK_SECRET_KEY ADMIN_USER_IDS PADDLE_API_KEY PADDLE_WEBHOOK_SECRET PADDLE_PRICE_PRO_MONTHLY PADDLE_PRICE_PRO_YEARLY)
OPTIONAL_SECRETS=(MERCADOPAGO_ACCESS_TOKEN MERCADOPAGO_WEBHOOK_SECRET OPENAI_API_KEY)

run gcloud services enable run.googleapis.com secretmanager.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com billingbudgets.googleapis.com --project "$GCP_PROJECT"

ensure_secret() {
  local name="$1" optional="$2"
  if [[ "${DRY_RUN:-0}" != "1" ]] && gcloud secrets describe "$name" --project "$GCP_PROJECT" >/dev/null 2>&1; then
    echo "reusing secret $name"; return 0
  fi
  local value; value="$(read_secret "$name (enter to skip)")"
  if [[ -z "$value" ]]; then
    [[ "$optional" == "optional" ]] && { echo "skipped optional $name"; return 1; }
    echo "$name is required." >&2; exit 2
  fi
  if [[ "${DRY_RUN:-0}" == "1" ]]; then echo "DRY: create secret $name"; return 0; fi
  printf '%s' "$value" | gcloud secrets create "$name" --data-file=- --project "$GCP_PROJECT" >/dev/null
}

MAPPINGS=()
for name in "${SECRETS[@]}"; do ensure_secret "$name" required; MAPPINGS+=("$name=$name:latest"); done
for name in "${OPTIONAL_SECRETS[@]}"; do
  if ensure_secret "$name" optional; then MAPPINGS+=("$name=$name:latest"); fi
done
SECRET_FLAG="$(IFS=,; echo "${MAPPINGS[*]}")"

run gcloud run deploy "$SERVICE" --source server --region "$REGION" --project "$GCP_PROJECT" \
  --allow-unauthenticated --min-instances 0 --max-instances 3 --memory 512Mi \
  --set-env-vars "NODE_ENV=production,CORS_ORIGINS=$APP_ORIGIN,CLERK_AUTHORIZED_PARTIES=$APP_ORIGIN,API_PUBLIC_URL=$API_ORIGIN,PADDLE_ENV=${PADDLE_ENV:-sandbox},MERCADOPAGO_PASSES_ENABLED=${MERCADOPAGO_PASSES_ENABLED:-false}" \
  --set-secrets "$SECRET_FLAG"

# Alert at 50%, 90% and 100% of US$20 a month. Alerts only; nothing is shut off.
run gcloud billing budgets create --billing-account "$BILLING_ACCOUNT" --display-name "gylio-monthly" \
  --budget-amount "${BUDGET_USD:-20}USD" --threshold-rule=percent=0.5 --threshold-rule=percent=0.9 --threshold-rule=percent=1.0

echo "Deployed. Map $API_ORIGIN to the service, then check: curl -s $API_ORIGIN/api/health"
