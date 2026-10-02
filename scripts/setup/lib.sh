# Shared helpers for the operator setup scripts. Source, don't run.
# DRY_RUN=1 prints every command instead of running it (used by the tests).

set -euo pipefail

run() {
  if [[ "${DRY_RUN:-0}" == "1" ]]; then
    printf 'DRY:'; printf ' %q' "$@"; printf '\n'
  else
    "$@"
  fi
}

require_cmd() {
  local cmd="$1" install="$2"
  if [[ "${DRY_RUN:-0}" == "1" ]]; then return 0; fi
  command -v "$cmd" >/dev/null 2>&1 || { echo "Missing '$cmd'. Install it with: $install" >&2; exit 2; }
}

require_var() {
  local name="$1" hint="$2"
  [[ -n "${!name:-}" ]] || { echo "Set $name first ($hint)." >&2; exit 2; }
}

# Read a secret without echoing it or leaving it in shell history.
read_secret() {
  local prompt="$1" value
  if [[ "${DRY_RUN:-0}" == "1" ]]; then printf 'dry-run-secret'; return; fi
  read -rsp "$prompt: " value; echo >&2
  printf '%s' "$value"
}
