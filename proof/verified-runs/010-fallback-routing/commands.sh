#!/usr/bin/env bash
set -euo pipefail
node --test --test-name-pattern "provider task runner records transient fallback metadata" test/provider-routing.test.mjs
