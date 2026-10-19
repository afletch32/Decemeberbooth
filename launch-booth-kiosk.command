#!/bin/zsh
set -euo pipefail

readonly CHROME_BIN="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
readonly KIOSK_PROFILE="${HOME}/Library/Application Support/Decemeberbooth Kiosk"
readonly BOOTH_URL="https://decemeberbooth.pages.dev/"

if [[ ! -x "${CHROME_BIN}" ]]; then
  print -u2 "Google Chrome was not found at ${CHROME_BIN}. Install Chrome or update this launcher path."
  exit 1
fi

mkdir -p "${KIOSK_PROFILE}"
exec "${CHROME_BIN}" \
  --user-data-dir="${KIOSK_PROFILE}" \
  --no-first-run \
  --kiosk \
  --kiosk-printing \
  "${BOOTH_URL}"
