# Durable AgentHarness and session design

<!-- Synced from jot zmnps2zu. Edit this file in-repo going forward. -->

Durable AgentHarness / session design notes.

## Framing

A fully durable `AgentHarness` is not realistic by itself because important dependencies are runtime JS supplied by the host app:

- tool implementations
- model/auth providers
- extensions and hook handlers
- resource loaders
- system-prompt callbacks/modifiers

The practical target is a semi-durable harness:

- session is the durable append-only state tree
- harness persists the state it owns into session entries
- the host app is responsible for recreating compatible non-persistable dependencies on resume
- recovery restarts from durable boundaries, not from an in-flight provider stream

## Session owns durable state

Treat session as all durable agent state, not just transcript history.

Existing session state already includes harness state:

- model changes
- thinking-level changes
- leaf entries
- labels
- compactions and branch summaries
- custom messages and custom entries

That suggests continuing with one durable session log rather than adding harness sidecars. Sidecars may still be useful for large blobs, but the session entry should remain the source-of-truth reference.

## What the app must provide on resume

The app must recreate compatible runtime dependencies:

- model registry / model objects
- tool registry
- extension set, versions, and ordering
- resource loaders
- system prompt providers/hooks
- auth providers
- app-specific hooks

Harness can validate stable IDs/versions/hashes when available, but it cannot serialize these dependencies itself.

## What harness should persist

Minimum useful durability entries:

- queued steer/followUp/nextTurn messages
- queue consumption tied to a turn
- pending session writes accepted during active operations
- pending write application status
- operation start/finish/interruption
- turn start/finish
- provider request start/finish, if needed for recovery diagnostics
- tool call start/finish, if we want safe tool recovery

Potential entries:

```ts
type DurableHarnessEntry =
  | QueueEnqueuedEntry
  | QueueConsumedEntry
  | PendingWriteEnqueuedEntry
  | PendingWriteAppliedEntry
  | OperationStartedEntry
  | OperationFinishedEntry
  | OperationInterruptedEntry
  | TurnStartedEntry
  | TurnFinishedEntry
  | ProviderRequestStartedEntry
  | ProviderRequestFinishedEntry
  | ToolCallStartedEntry
  | ToolCallFinishedEntry;
```

Every accepted mutation must be durable before the public API resolves.

## Recovery model

On startup:

1. Host app registers tools/models/extensions/resources/auth/hooks.
2. Harness opens session.
3. Harness reduces session entries into:
   - current leaf
   - conversation branch
   - harness config
   - queues
   - pending writes
   - active operation/turn/tool state
4. Harness validates required runtime dependencies.
5. Harness reconciles unfinished operation state.

Provider streams are not resumable. Recovery can only retry from a durable boundary or mark the operation interrupted.

## Recovery policies

Default conservative policy:

- unfinished agent turn: mark interrupted, preserve durable queues/pending writes, return idle
- unfinished provider request: mark interrupted; do not retry automatically
- unfinished tool call: append interrupted/error tool result; retry only if the tool declares retry-safe/idempotent
- unfinished compaction: rerun if no compaction entry exists
- unfinished branch summary/tree navigation: rerun/apply missing summary or leaf entries if safe

Optional policy:

```ts
recovery: "mark_interrupted" | "retry_unfinished"
```

`retry_unfinished` must be guarded around non-idempotent tool calls.

## Critical scenarios

### Queues

- Crash before `queue_enqueued`: message was not accepted.
- Crash after `queue_enqueued`: message is restored.
- Crash after queue drain but before durable turn record: risk of loss/duplication.
- Required invariant: consumed queue IDs must be recorded in `turn_started` or equivalent before they are considered consumed.

### Pending writes

- Crash before `pending_write_enqueued`: write was not accepted.
- Crash after enqueue before apply: recovery applies it.
- Crash after apply before applied marker: deterministic target entry IDs let recovery detect the entry already exists and mark it applied.

### Agent loop turn

- Crash before provider request: retry or mark interrupted.
- Crash during provider request: mark interrupted by default.
- Crash after provider response before assistant message persisted: response is lost unless provider result was journaled.
- Crash after assistant message persisted: recover from durable message.

### Tool calls

- Crash after tool call starts but before result: external side effects may already have happened.
- Default recovery should not rerun non-idempotent tools.
- Tool calls need stable IDs and retry-safety metadata for automatic recovery.

### Compaction

- Crash before summary generation: rerun preparation/summary.
- Crash after generated summary but before compaction entry: rerun unless summary was journaled.
- Crash after compaction entry: operation is complete; append finish marker if missing.

### Branch summary / tree navigation

- Crash before summary: rerun or mark interrupted.
- Crash after summary entry before leaf entry: append missing leaf entry.
- Crash after leaf entry: operation is complete; append finish marker if missing.

## Minimum viable spike

1. Add durable queue entries.
2. Add durable pending write entries with deterministic target IDs.
3. Add operation start/finish/interrupted entries.
4. Add turn start with consumed queue IDs.
5. Recover by reducing the session log.
6. Mark unfinished agent turns interrupted by default.
7. Rerun unfinished compaction/tree operations only when no final entry exists.
8. Do not retry unfinished tool calls unless tool metadata says retry-safe.

## Open questions

- Which harness config entries should move into session first: tools, active tools, resources, stream options, system prompt refs?
- Should resolved system prompt text be snapshotted per turn for audit/debug?
- Do we require strict dependency ID/version matching on resume?
- How much provider request data should be journaled?
- Should recovery append user-visible assistant interruption messages or only internal operation entries?
- Should storage support truncating a final partial JSONL line during recovery?
