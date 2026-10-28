#!/usr/bin/env bash
# First deploy, and every later one: checks the token, makes sure the database exists, applies the
# migrations, builds the site at the root path, adds the headers files and deploys the Worker.
# Usually run through redeploy.sh. Nothing in here prints a secret.
set -euo pipefail
# shellcheck source=lib.sh
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

build_site() {
  say "Building the site at the root path..."
  # Everything the build reads is set here, so a stray .env file on this Mac cannot change what ships:
  # same-origin API (empty base), account sync on (this Worker is the API it talks to), billing off until
  # payments are decided, the live Clerk key.
  (cd "$REPO_ROOT" && VITE_BASE_PATH=/ VITE_API_BASE_URL= VITE_SYNC_ENABLED=true VITE_BILLING_ENABLED=false VITE_CLERK_PUBLISHABLE_KEY="$CLERK_KEY" ${GYLIO_BUILD_CMD:-npm run build}) || die "The site build failed."
  # Trust the built output, not an environment variable: a build for the old /gylio/ address must not ship.
  local index="$REPO_ROOT/dist/index.html"
  [ -f "$index" ] || die "The build produced no dist/index.html."
  if grep -q '/gylio/' "$index"; then die "The built site still points at /gylio/ instead of the root path."; fi
  grep -q 'src="/assets/\|href="/assets/' "$index" || die "The built site does not load its files from /assets/."
  node "$WORKER_DIR/scripts/write-static.ts" "$REPO_ROOT/dist" || die "Could not write _headers and security.txt."
}

main() {
  check_node
  load_clerk_key
  load_credentials
  verify_token
  ensure_database
  guard_placeholders
  say "Applying database migrations..."
  (cd "$WORKER_DIR" && wrangler d1 migrations apply "$DATABASE_NAME" --remote) || die "Applying migrations failed."
  build_site
  load_holder
  check_privacy_page
  if [ -n "$HOLDER_VALUE" ]; then
    say "Sign-up: OPEN (holder named, privacy page checked)."
  else
    say "Sign-up: CLOSED. $HOLDER_NOTE People who already have an account keep working."
  fi
  say "Deploying the Worker and the site..."
  # Attached to the terminal, never piped, so wrangler's questions can be answered. The holder goes in
  # with --var for this deploy only; it is not written to any file in the repository.
  if [ -n "$HOLDER_VALUE" ]; then
    (cd "$WORKER_DIR" && wrangler deploy --var "HOLDER_NAME:$HOLDER_VALUE") || die "wrangler deploy failed."
  else
    (cd "$WORKER_DIR" && wrangler deploy) || die "wrangler deploy failed."
  fi
  say ""
  say "Deployed. Now check, in a browser:"
  say "  https://gylio.app/api/v1/health      (ok, worker, database, auth, usageOk all true)"
  say "  https://gylio.app/.well-known/security.txt"
  say "  https://gylio.app/                    (the app loads; no console errors)"
  remind_roll_token
}

main "$@"
