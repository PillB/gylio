#!/usr/bin/env bash
# First deploy, and every later one: checks the token, makes sure the database exists, applies the
# migrations, builds the site at the root path, adds the headers files and deploys the Worker.
# Usually run through redeploy.sh. Nothing in here prints a secret.
set -euo pipefail
# shellcheck source=lib.sh
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

build_site() {
  say "Building the site at the root path..."
  (cd "$REPO_ROOT" && VITE_BASE_PATH=/ ${GYLIO_BUILD_CMD:-npm run build}) || die "The site build failed."
  # Trust the built output, not an environment variable: a build for the old /gylio/ address must not ship.
  local index="$REPO_ROOT/dist/index.html"
  [ -f "$index" ] || die "The build produced no dist/index.html."
  if grep -q '/gylio/' "$index"; then die "The built site still points at /gylio/ instead of the root path."; fi
  grep -q 'src="/assets/\|href="/assets/' "$index" || die "The built site does not load its files from /assets/."
  node "$WORKER_DIR/scripts/write-static.ts" "$REPO_ROOT/dist" || die "Could not write _headers and security.txt."
}

main() {
  check_node
  load_credentials
  verify_token
  ensure_database
  guard_placeholders
  say "Applying database migrations..."
  (cd "$WORKER_DIR" && wrangler d1 migrations apply "$DATABASE_NAME" --remote) || die "Applying migrations failed."
  build_site
  say "Deploying the Worker and the site..."
  # Attached to the terminal, never piped, so wrangler's questions can be answered.
  (cd "$WORKER_DIR" && wrangler deploy) || die "wrangler deploy failed."
  say ""
  say "Deployed. Now check, in a browser:"
  say "  https://gylio.app/api/v1/health      (ok, worker, database, auth, usageOk all true)"
  say "  https://gylio.app/.well-known/security.txt"
  say "  https://gylio.app/                    (the app loads; no console errors)"
  remind_roll_token
}

main "$@"
