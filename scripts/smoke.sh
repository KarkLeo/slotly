#!/usr/bin/env bash
# Checks a running production build the way Traefik reaches it: a foreign Host and relative redirects.
set -uo pipefail

base_url=${BASE_URL:-http://127.0.0.1:3000}
host=${SMOKE_HOST:-slotly.example}
site_url=${SITE_URL:-http://$host}
failures=0
status="" location="" www_authenticate="" body=""

request() {
  local method=$1 path=$2 headers_file body_file
  headers_file=$(mktemp)
  body_file=$(mktemp)
  local args=(-sS --max-time 10 -o "$body_file" -D "$headers_file" -w '%{http_code}' -X "$method" -H "Host: $host")
  if [[ $method == POST ]]; then
    args+=(-H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' --data '{}')
  fi
  status=$(curl "${args[@]}" "$base_url$path") || status=000
  location=$(header location "$headers_file")
  www_authenticate=$(header www-authenticate "$headers_file")
  body=$(cat "$body_file")
  rm -f "$headers_file" "$body_file"
}

header() {
  grep -i "^$1:" "$2" | head -n1 | sed -E 's/^[^:]+:[[:space:]]*//' | tr -d '\r'
}

expect() {
  if [[ $2 == "$3" ]]; then
    echo "ok    $1"
  else
    echo "FAIL  $1: expected '$2', got '$3'"
    failures=$((failures + 1))
  fi
}

expect_contains() {
  if [[ $3 == *"$2"* ]]; then
    echo "ok    $1"
  else
    echo "FAIL  $1: expected to contain '$2', got '$3'"
    failures=$((failures + 1))
  fi
}

json_field() {
  node -e 'try { console.log(JSON.parse(process.argv[1])[process.argv[2]] ?? "") } catch { console.log("") }' "$1" "$2"
}

request GET /
expect "GET / status" 200 "$status"

request GET /api/health
expect "GET /api/health status" 200 "$status"

request GET /app
expect "GET /app status" 307 "$status"
expect "GET /app location" "/login?next=%2Fapp" "$location"

request GET "/auth/confirm?token_hash=bad&type=email"
expect "GET /auth/confirm status" 307 "$status"
expect "GET /auth/confirm location" "/login?error=link" "$location"

request POST /api/mcp
expect "POST /api/mcp status" 401 "$status"
expect_contains "POST /api/mcp resource_metadata" \
  "resource_metadata=\"$site_url/.well-known/oauth-protected-resource/api/mcp\"" "$www_authenticate"

request GET /.well-known/oauth-protected-resource/api/mcp
expect "GET protected resource metadata status" 200 "$status"
expect "GET protected resource metadata resource" "$site_url/api/mcp" "$(json_field "$body" resource)"

if ((failures > 0)); then
  echo "$failures check(s) failed"
  exit 1
fi
echo "all checks passed"
