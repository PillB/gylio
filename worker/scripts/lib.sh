#!/usr/bin/env bash
# Shared helpers for the operator scripts (setup, redeploy, export, secret).
# Runs on the owner's Mac (bash 3.2): no associative arrays, mapfile or ${var,,}.
# Rules (docs/CLOUDFLARE_GO_LIVE_MANUAL.md): the token lives for one run, is typed hidden, is never
# printed, and wrangler's browser sign-in is never used. Nothing here prints a secret value.

# The pinned wrangler, stated once. Tests replace the whole command with GYLIO_WRANGLER.
WRANGLER_VERSION="4.153.0"
# wrangler's engines field is node ">=22.0.0" (npm registry, checked 27 Oct 2026). The repo itself pins Node 24 in .nvmrc.
NODE_MIN_MAJOR=22
NODE_MIN_MINOR=18
DATABASE_NAME="gylio"
PLACEHOLDER_PREFIX="TODO_"
CF_API_BASE="${GYLIO_CF_API_BASE:-https://api.cloudflare.com/client/v4}"

LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKER_DIR="$(cd "$LIB_DIR/.." && pwd)"
REPO_ROOT="$(cd "$WORKER_DIR/.." && pwd)"
CONFIG_FILE="$WORKER_DIR/wrangler.jsonc"

say() { printf '%s\n' "$*"; }
die() {
  printf 'Stopped: %s\n' "$*" >&2
  printf 'Nothing was deployed.\n' >&2
  exit 1
}

interactive() { [ -t 0 ]; }

wrangler() {
  if [ -n "${GYLIO_WRANGLER:-}" ]; then
    # shellcheck disable=SC2086
    $GYLIO_WRANGLER "$@"
  else
    npx --yes "wrangler@${WRANGLER_VERSION}" "$@"
  fi
}

check_node() {
  local version rest major minor
  version="${GYLIO_NODE_VERSION:-$(node -v 2>/dev/null || true)}"
  rest="${version#v}"
  major="${rest%%.*}"
  minor="${rest#*.}"
  minor="${minor%%.*}"
  case "$major$minor" in
    ''|*[!0-9]*) die "Node is not installed. Install Node 24 (nodejs.org), then run this again." ;;
  esac
  # wrangler needs 22 or newer; the build helper runs TypeScript directly, which Node has done by default since 22.18.
  if [ "$major" -lt "$NODE_MIN_MAJOR" ] || { [ "$major" -eq "$NODE_MIN_MAJOR" ] && [ "$minor" -lt "$NODE_MIN_MINOR" ]; }; then
    die "Node $version is too old (needs $NODE_MIN_MAJOR.$NODE_MIN_MINOR or newer for wrangler $WRANGLER_VERSION and the build helper; this repository uses 24)."
  fi
}

ask_yes() {
  # Default is yes; any answer starting with n or N is no.
  local reply
  read -r -p "$1 [Y/n] " reply || reply=""
  case "$reply" in n*|N*) return 1 ;; *) return 0 ;; esac
}

read_account_id() {
  local value
  read -r -p "Cloudflare account id: " value || value=""
  [ -n "$value" ] || die "No account id given."
  CLOUDFLARE_ACCOUNT_ID="$value"
}

read_token() {
  local value
  read -rs -p "API token (typed hidden): " value || value=""
  printf '\n'
  [ -n "$value" ] || die "No token given."
  CLOUDFLARE_API_TOKEN="$value"
  say "Token received (${#value} characters)."
}

load_credentials() {
  if interactive; then
    if [ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ] && ! ask_yes "Use the account id already in this window (${CLOUDFLARE_ACCOUNT_ID:0:4}...)?"; then
      unset CLOUDFLARE_ACCOUNT_ID
    fi
    [ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ] || read_account_id
    if [ -n "${CLOUDFLARE_API_TOKEN:-}" ] && ! ask_yes "Use the token already in this window (${#CLOUDFLARE_API_TOKEN} characters)?"; then
      unset CLOUDFLARE_API_TOKEN
    fi
    [ -n "${CLOUDFLARE_API_TOKEN:-}" ] || read_token
  else
    [ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ] || die "No terminal and no CLOUDFLARE_ACCOUNT_ID in the environment."
    [ -n "${CLOUDFLARE_API_TOKEN:-}" ] || die "No terminal and no CLOUDFLARE_API_TOKEN in the environment."
  fi
  export CLOUDFLARE_ACCOUNT_ID CLOUDFLARE_API_TOKEN
}

# Prints active, refused or foreign. The token goes to curl through a config on stdin, so it is
# never on a command line where `ps` could show it.
verify_once() {
  local response
  if ! response="$(printf 'header = "Authorization: Bearer %s"\n' "$CLOUDFLARE_API_TOKEN" |
    curl -sS -m 20 -K - "$CF_API_BASE/accounts/$CLOUDFLARE_ACCOUNT_ID/tokens/verify" 2>/dev/null)"; then
    printf 'unreachable'
    return 0
  fi
  printf '%s' "$response" | node -e '
    let text = "";
    process.stdin.on("data", (d) => (text += d));
    process.stdin.on("end", () => {
      let body;
      try { body = JSON.parse(text); } catch { return process.stdout.write("foreign"); }
      const looksLikeCloudflare = body && typeof body.success === "boolean" && Array.isArray(body.errors);
      if (!looksLikeCloudflare) return process.stdout.write("foreign");
      process.stdout.write(body.success && body.result && body.result.status === "active" ? "active" : "refused");
    });'
}

verify_token() {
  local attempt=1 result
  while [ "$attempt" -le 3 ]; do
    result="$(verify_once)"
    case "$result" in
      active) say "Token checked: active."; return 0 ;;
      unreachable) die "Could not reach Cloudflare to check the token. Check the internet connection and run again." ;;
      foreign) die "The answer did not come from Cloudflare's API, so the token was not sent anywhere else. Stopping." ;;
    esac
    # refused
    if ! interactive || [ "$attempt" -ge 3 ]; then
      die "Cloudflare refused the token (wrong account id, expired, or missing permissions)."
    fi
    say "Cloudflare refused that token or account id. Try again ($attempt of 3 used)."
    read_account_id
    read_token
    attempt=$((attempt + 1))
  done
}

# Exact-name lookup: a database named gylio-old or my-gylio must never match.
find_database_id() {
  local json
  json="$(wrangler d1 list --json)" || die "wrangler could not list the databases."
  printf '%s' "$json" | node -e '
    let text = "";
    process.stdin.on("data", (d) => (text += d));
    process.stdin.on("end", () => {
      let list;
      try { list = JSON.parse(text); } catch { process.exit(2); }
      const match = Array.isArray(list) ? list.find((d) => d && d.name === process.argv[1]) : null;
      process.stdout.write(match ? String(match.uuid || match.id || "") : "");
    });' "$DATABASE_NAME"
}

config_database_id() {
  node -e '
    const text = require("fs").readFileSync(process.argv[1], "utf8").replace(/^\s*\/\/.*$/gm, "");
    process.stdout.write(String((JSON.parse(text).d1_databases || [])[0]?.database_id || ""));' "$CONFIG_FILE"
}

ensure_database() {
  local id configured
  id="$(find_database_id)"
  if [ -z "$id" ]; then
    say "No database named $DATABASE_NAME yet: creating it."
    wrangler d1 create "$DATABASE_NAME" || die "wrangler could not create the database."
    id="$(find_database_id)"
  fi
  [ -n "$id" ] || die "The database $DATABASE_NAME was not found after creating it."
  case "$id" in *[!0-9a-fA-F-]*) die "The database id looks wrong." ;; esac

  configured="$(config_database_id)"
  case "$configured" in
    "$id") say "Database id already in the local config." ;;
    "$PLACEHOLDER_PREFIX"*)
      node -e '
        const fs = require("fs");
        const file = process.argv[1];
        fs.writeFileSync(file, fs.readFileSync(file, "utf8").replace(/"database_id": "TODO_[A-Z0-9_]*"/, `"database_id": "${process.argv[2]}"`));' "$CONFIG_FILE" "$id"
      say "LOCAL change: do not commit worker/wrangler.jsonc (it now holds the database id)." ;;
    *) die "worker/wrangler.jsonc already holds a different database id. Restore it with: git checkout -- worker/wrangler.jsonc" ;;
  esac
}

# Any leftover placeholder stops the run before the build or a deploy.
guard_placeholders() {
  if grep -n "$PLACEHOLDER_PREFIX" "$CONFIG_FILE" >/dev/null 2>&1; then
    die "worker/wrangler.jsonc still has a $PLACEHOLDER_PREFIX placeholder: $(grep -o "$PLACEHOLDER_PREFIX[A-Z_]*" "$CONFIG_FILE" | head -1)"
  fi
}

remind_roll_token() {
  say ""
  say "Last step: roll (regenerate) the deploy token in the Cloudflare dashboard and close this window."
}
