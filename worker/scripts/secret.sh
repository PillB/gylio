#!/usr/bin/env bash
# Sets one named Worker secret. The value is typed at wrangler's own hidden prompt; nothing prints it.
#   bash worker/scripts/secret.sh NAME
set -euo pipefail
# shellcheck source=lib.sh
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

name="${1:-}"
case "$name" in
  [A-Z]*) : ;;
  *) die "Give the secret's name in capitals, for example: bash worker/scripts/secret.sh CLERK_SECRET_KEY" ;;
esac
case "$name" in *[!A-Z0-9_]*) die "A secret name uses capitals, digits and underscores only." ;; esac

check_node
load_credentials
verify_token
guard_placeholders
(cd "$WORKER_DIR" && wrangler secret put "$name") || die "Setting the secret failed."
say "Secret $name set."
remind_roll_token
