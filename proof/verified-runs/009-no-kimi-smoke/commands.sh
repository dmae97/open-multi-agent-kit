#!/usr/bin/env bash
set -euo pipefail
KIMI_BIN=/nonexistent/kimi OMK_LEGACY_CHAT=0 OMK_MCP_PREFLIGHT=off OMK_PROJECT_ROOT="$PWD" npm run verify:no-kimi
