# FS scan cache architecture

This document defines the shared filesystem-scan cache contract used by `pi-natives` discovery/search callers.

## Cache key contract

Cache entries are keyed by:

- `root` (absolute search root path)
- `include_hidden` (hidden-file visibility)
- `use_gitignore` (ignore-rule behavior)

Callers with different visibility/ignore semantics must use different profiles so they do not share incompatible cache entries.

## Freshness and recheck contract

`crates/pi-natives/src/fs_cache.rs` owns global policy:

- `FS_SCAN_CACHE_TTL_MS` (default `1000`)
- `FS_SCAN_EMPTY_RECHECK_MS` (default `200`)
- `FS_SCAN_CACHE_MAX_ENTRIES` (default `16`)

`get_or_scan()` returns `cache_age_ms` so callers can decide whether an empty filtered result should trigger `force_rescan()`.

Current callers using this contract:

- `fd` (`fuzzyFind`) uses empty-result fast recheck.
- `grep` consumes shared scan entries and applies grep-specific glob/type filtering on top.

## Invalidation contract

Mutation-triggered invalidation is explicit and path-based via `invalidateFsScanCache`.

Coding-agent routes invalidation through `packages/coding-agent/src/tools/fs-cache-invalidation.ts`:

- `invalidateFsScanAfterWrite(path)`
- `invalidateFsScanAfterDelete(path)`
- `invalidateFsScanAfterRename(oldPath, newPath)` (invalidates both paths)

Write/edit flows call these helpers after successful filesystem mutation.

## Caller discovery profiles

Callers should not build ad-hoc discovery flags inline. Use named profile/policy helpers at callsites.

Current profile boundaries:

- File mention candidate discovery (`file-mentions.ts`): hidden on, gitignore on, node_modules included.
- TUI fuzzy `@` discovery (`autocomplete.ts`): hidden on, gitignore on, bounded result count.
- TUI local path prefix completion keeps a separate per-directory `readdir` cache as an intentional latency fast-path; global fuzzy discovery remains on natives shared scan cache.
