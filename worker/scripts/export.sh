#!/usr/bin/env bash
# Backs up the production database to a file OUTSIDE the repository. Prints no data.
#   bash worker/scripts/export.sh [output-file]
set -euo pipefail
# shellcheck source=lib.sh
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

out="${1:-$HOME/gylio-backups/gylio-$(date +%Y%m%d-%H%M%S).sql}"
case "$(cd "$(dirname "$out")" 2>/dev/null && pwd)/$(basename "$out")" in
  "$REPO_ROOT"/*) die "Choose a path outside the repository: a backup holds people's data." ;;
esac
mkdir -p "$(dirname "$out")"
chmod 700 "$(dirname "$out")" 2>/dev/null || true

check_node
load_credentials
verify_token
(cd "$WORKER_DIR" && wrangler d1 export "$DATABASE_NAME" --remote --output="$out") || die "The export failed."
chmod 600 "$out" 2>/dev/null || true
say "Backup written to: $out"
remind_roll_token
