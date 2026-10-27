#!/usr/bin/env bash
# The everyday command: deploys exactly what is on main.
#   stops unless the checkout is on main;
#   stops on any uncommitted change other than worker/wrangler.jsonc, and shows it;
#   restores worker/wrangler.jsonc, pulls fast-forward only, checks HEAD equals origin/main;
#   installs from the lockfiles as CI does, then runs setup.sh.
set -euo pipefail
# shellcheck source=lib.sh
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

cd "$REPO_ROOT"
[ "$(git rev-parse --abbrev-ref HEAD)" = "main" ] || die "This checkout is not on main (it is on $(git rev-parse --abbrev-ref HEAD)). Run: git checkout main"

dirty="$(git status --porcelain --untracked-files=no | grep -v ' worker/wrangler.jsonc$' || true)"
if [ -n "$dirty" ]; then
  say "Uncommitted changes:"
  say "$dirty"
  git diff --stat -- . ':(exclude)worker/wrangler.jsonc' || true
  die "Commit or discard these first; a deploy must match main."
fi

git checkout -- worker/wrangler.jsonc
git pull --ff-only || die "Could not fast-forward main."
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || die "HEAD is not origin/main after pulling."
say "Deploying commit $(git rev-parse --short HEAD): $(git log -1 --format=%s)"

${GYLIO_INSTALL_CMD:-npm ci} || die "Installing the site's dependencies from the lockfile failed."
(cd worker && ${GYLIO_INSTALL_CMD:-npm ci}) || die "Installing the Worker's dependencies from the lockfile failed."

exec bash "$LIB_DIR/setup.sh"
