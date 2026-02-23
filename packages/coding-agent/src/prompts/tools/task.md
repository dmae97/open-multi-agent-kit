# Task

Launch subagents to execute parallel, well-scoped tasks.
{{#if asyncEnabled}}
Use `read jobs://` to inspect background task state and `read jobs://<job_id>` for detailed status/output.
Wait for async results with `poll_jobs` — it blocks until complete. Do NOT poll `read jobs://` in a loop.
{{/if}}
## Subagent capabilities
- **Inherit** full system prompt (AGENTS.md, context files, skills) — do NOT restate project rules in `context`
- **Lack** your conversation history — decisions, approach choices, file contents you read, user requirements from chat
- **Can** grep parent conversation file for supplementary details
---
## Parameters
### `agent` (required)
Agent type for all tasks in this batch.
### `context` (optional — strongly recommended)
Shared background prepended verbatim to every task `assignment`. Only session-specific information subagents lack.
<critical>
Do NOT include project rules/conventions/style — subagents already have AGENTS.md. Restating any AGENTS.md rule in `context` is a bug. Per-line test: "True for ANY repo task, or only THIS batch?" If any task → delete.
</critical>
Template (omit non-applicable sections):
````
## Goal
One sentence: what batch accomplishes together.
## Non-goals
What tasks must not touch/attempt.
## Constraints
- Task-specific MUST / MUST NOT rules not already in AGENTS.md
- Session decisions affecting implementation
## Reference Files
- `path/to/file.ext` — pattern demo
## API Contract (if tasks produce/consume shared interface)
```language
// Exact type definitions, function signatures
```
## Acceptance (global)
- Definition of "done" for batch
- build/test/lint verification happens AFTER all tasks — not inside tasks
````
### `tasks` (required)
Array of tasks executing in parallel.

|Field|Required|Purpose|
|---|---|---|
|`id`|✓|CamelCase identifier, max 32 chars|
|`description`|✓|Short one-liner for UI only — not seen by subagent|
|`assignment`|✓|Complete per-task instructions. See [Writing an assignment](#writing-an-assignment).|
|`skills`||Skill names preload. Use only when changes correctness.|
{{#if isolationEnabled}}
### `isolated` (optional)
Run in isolated git worktree; returns patches. Use when tasks edit overlapping files.
{{/if}}

### `schema` (optional — recommended for structured output)
JTD schema defining expected response structure. **Never describe output format in `context` or `assignment`**.

<caution>
**Schema vs agent mismatch causes null output.** Structured agents (e.g., `explore`) have built-in schemas. If you describe output format in `context`/`assignment` without overriding via `schema`, the built-in schema wins and agent submits `null`. Either: (1) use `schema` to override, (2) use `task` agent (no built-in schema), or (3) match instructions to agent's expected shape.
</caution>
---

## Writing an assignment

<critical>
`assignment` must contain enough info for agent to act **without asking a clarifying question**.
**Minimum bar:** under ~8 lines or missing acceptance criteria = too vague. One-liners guaranteed failure.

Structure every assignment:
```
## Target
- Files: exact path(s)
- Symbols/entrypoints: specific functions, types, exports
- Non-goals: what task must NOT touch

## Change
- Step-by-step: add/remove/rename/restructure
- Patterns/APIs to use; reference files if applicable

## Edge Cases / Don't Break
- Tricky cases, existing behavior that must survive

## Acceptance (task-local)
- Expected behavior or observable result
- DO NOT include project-wide build/test/lint commands
```

`context` = shared background. `assignment` = only delta: file-specific instructions, local edge cases, per-task acceptance.

### Anti-patterns (ban these)
- **Vague assignments** — "Refactor this to be cleaner", "Fix the bug in streaming"
- **Vague context** — "Use existing patterns", "Follow conventions"
- **Redundant context** — restating AGENTS.md rules (coding style, imports, formatting)
- **Output format in prose** — structured agents have built-in schemas; prose format → null. Use `schema`
- **Test/lint in parallel tasks** — concurrent builds see half-finished edits, loop. Each task edits, stops. Caller verifies after

Can't specify scope yet? Create a **Discovery task** first, then fan out with explicit paths.

### Delegate intent, not keystrokes

Be specific about: constraints, naming, API contracts, "don't break" items, acceptance.
Delegate: code reading, approach selection, edit locations, implementation. Line-by-line dictation makes you bottleneck.
</critical>

## Example

<example type="good" label="Shared rules in context, deltas in assignment">
<context>
## Goal
Port WASM modules to N-API, matching existing pi-natives conventions.
## Non-goals
Do not touch TS bindings or downstream consumers — separate phase.
## Constraints
- MUST use `#[napi]` attribute macro on all exports
- MUST return `napi::Result<T>` for fallible ops; never panic
- MUST use `spawn_blocking` for filesystem I/O or >1ms work
## Acceptance (global)
- Caller verifies after all tasks: `cargo test -p pi-natives` and `cargo build -p pi-natives`
- Individual tasks must NOT run these commands themselves
</context>
<tasks>
  <task name="PortGrep">
    <description>Port grep module to N-API</description>
    <assignment>
## Target
- Files: `src/grep.rs`, `src/lib.rs` (registration only)
- Symbols: search, search_multi, compile_pattern
## Change
- Implement three N-API exports matching signatures in API Contract
## Acceptance (task-local)
- Three functions exported with correct signatures
</assignment>
  </task>
  <task name="PortHighlight">
    <description>Port highlight module to N-API</description>
    <assignment>## Target
- Files: `src/highlight.rs`, `src/lib.rs` (registration only)
…</assignment>
  </task>
</tasks>
</example>
---
## Task scope
Each task: **at most 3–5 files**. Glob paths, "update all", package-wide scope = too broad.
**Fix:** enumerate files first (discovery task), then fan out per file or small cluster.
---
## Parallelization
**Test:** Can task B produce correct output without seeing A's result? Yes → parallel. No → sequential.

|First|Then|Reason|
|---|---|---|
|Define types/interfaces|Implement consumers|Need contract|
|Create API exports|Write callers|Need signatures|
|Scaffold structure|Implement bodies|Need shape|
|Core module|Dependent modules|Import dependency|
|Schema/DB migration|Application logic|Schema dependency|
**Safe to parallelize:** independent modules, tests for existing code, isolated file-scoped refactors.
**Phased execution:** Phase 1 (yourself): define interfaces/API shape. Phase 2 (parallel): implement against known contract. Phase 3 (yourself): integrate, verify builds. Phase 4 (parallel): dependent layer.
---
## Pre-flight checklist
- [ ] `context` has only session-specific info not in AGENTS.md
- [ ] Each `assignment` follows template — not one-liner
- [ ] Each `assignment` includes edge cases / "don't break" items
- [ ] Tasks truly parallel (no hidden dependencies)
- [ ] Scope small, file paths explicit (no globs)
- [ ] No task runs project-wide build/test/lint — you do after all complete
- [ ] `schema` used if you expect structured information
---
## Agents

{{#list agents join="\n"}}
<agent name="{{name}}"{{#if output}} output="structured"{{/if}}>
<description>{{description}}</description>
<tools>{{default (join tools ", ") "All tools"}}</tools>
</agent>
{{/list}}