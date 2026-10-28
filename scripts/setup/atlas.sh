#!/usr/bin/env bash
# Create the free MongoDB Atlas cluster, the API's database user and the
# connection string, and store that string straight into Google Secret Manager
# (it never prints). Safe to re-run: existing pieces are reused.
#
#   ATLAS_PROJECT_ID=<id> GCP_PROJECT=<id> scripts/setup/atlas.sh
#   DRY_RUN=1 ... to print the commands only
source "$(dirname "$0")/lib.sh"

require_cmd atlas "brew install mongodb-atlas-cli && atlas auth login"
require_cmd gcloud "brew install --cask google-cloud-sdk && gcloud auth login"
require_var ATLAS_PROJECT_ID "Atlas → Project settings → Project ID"
require_var GCP_PROJECT "the Google Cloud project that runs the API"

CLUSTER="${ATLAS_CLUSTER:-gylio}"
REGION="${ATLAS_REGION:-SA_EAST_1}"   # São Paulo: closest free-tier region to Lima
DB_USER="${ATLAS_DB_USER:-gylio_api}"

if [[ "${DRY_RUN:-0}" == "1" ]] || ! atlas clusters describe "$CLUSTER" --projectId "$ATLAS_PROJECT_ID" >/dev/null 2>&1; then
  run atlas clusters create "$CLUSTER" --provider AWS --region "$REGION" --tier M0 --projectId "$ATLAS_PROJECT_ID"
  run atlas clusters watch "$CLUSTER" --projectId "$ATLAS_PROJECT_ID"
fi

# The API's database user. Re-running must not change its password: running Cloud
# Run instances keep the old connection string until they restart, so a silent
# rotation would break the live API. Rotate only when asked (ROTATE_DB_PASSWORD=1).
USER_EXISTS=0
if [[ "${DRY_RUN:-0}" != "1" ]] && atlas dbusers describe "$DB_USER" --projectId "$ATLAS_PROJECT_ID" >/dev/null 2>&1; then
  USER_EXISTS=1
fi
if [[ "$USER_EXISTS" == "1" && "${ROTATE_DB_PASSWORD:-0}" != "1" ]]; then
  echo "Database user $DB_USER exists; keeping its password and the stored MONGODB_URI. Set ROTATE_DB_PASSWORD=1 to rotate."
  echo "Atlas ready: cluster $CLUSTER ($REGION, M0)."
  exit 0
fi
if [[ "${DRY_RUN:-0}" == "1" ]]; then DB_PASS="dry-run"; else DB_PASS="$(openssl rand -base64 24 | tr -d '/+=')"; fi
if [[ "$USER_EXISTS" == "1" || "${DRY_RUN:-0}" == "1" && "${ROTATE_DB_PASSWORD:-0}" == "1" ]]; then
  run atlas dbusers update "$DB_USER" --password "$DB_PASS" --projectId "$ATLAS_PROJECT_ID"
else
  run atlas dbusers create --username "$DB_USER" --password "$DB_PASS" --role "readWrite@gylio" --projectId "$ATLAS_PROJECT_ID"
fi

# Cloud Run has no fixed outbound IP without a paid NAT, so the access list is open
# and the strong generated password is the protection. Stated in the report.
run atlas accessLists create 0.0.0.0/0 --type cidrBlock --comment "Cloud Run (no fixed egress IP)" --projectId "$ATLAS_PROJECT_ID" || true

if [[ "${DRY_RUN:-0}" == "1" ]]; then
  HOST="cluster.example.mongodb.net"
else
  HOST="$(atlas clusters connectionStrings describe "$CLUSTER" --projectId "$ATLAS_PROJECT_ID" -o json \
    | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(new URL(JSON.parse(s).standardSrv).host))')"
fi
URI="mongodb+srv://${DB_USER}:${DB_PASS}@${HOST}/gylio?retryWrites=true&w=majority"

if [[ "${DRY_RUN:-0}" == "1" ]]; then
  echo "DRY: store MONGODB_URI for $HOST in Secret Manager"
elif gcloud secrets describe MONGODB_URI --project "$GCP_PROJECT" >/dev/null 2>&1; then
  printf '%s' "$URI" | gcloud secrets versions add MONGODB_URI --data-file=- --project "$GCP_PROJECT" >/dev/null
else
  printf '%s' "$URI" | gcloud secrets create MONGODB_URI --data-file=- --project "$GCP_PROJECT" >/dev/null
fi
echo "Atlas ready: cluster $CLUSTER ($REGION, M0). MONGODB_URI stored in Secret Manager; it was not printed."
[[ "${ROTATE_DB_PASSWORD:-0}" == "1" ]] && echo "Password rotated: run scripts/setup/cloudrun.sh again so the API restarts with the new connection string."
echo "Atlas M0 has no backups: schedule 'mongodump' weekly (see the report)."
