#!/usr/bin/env bash
# Runs the Sprint 1 end-to-end test: boots a throwaway backend + frontend and drives
# them with Playwright. Extra args are passed to `playwright test` (e.g. --headed, --ui).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# backend venv (first run only)
if [ ! -x "$ROOT/backend/.venv/bin/uvicorn" ]; then
  echo "▸ creating backend venv"
  python3 -m venv "$ROOT/backend/.venv"
  "$ROOT/backend/.venv/bin/pip" install -q -r "$ROOT/backend/requirements.txt"
fi

# frontend deps + browser (first run only)
cd "$ROOT/frontend"
[ -d node_modules ] || { echo "▸ installing frontend deps"; npm install --silent; }
npx playwright install chromium >/dev/null

echo "▸ running e2e (backend :${E2E_BACKEND_PORT:-8765}, frontend :${E2E_FRONTEND_PORT:-5174})"
npx playwright test "$@"
