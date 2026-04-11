# Phase 2 Plan: Batched Delivery for Non-Awaited Jobs

## Problem (Separate from Race Condition)

When an agent runs normally without using `await`, background jobs that complete during the turn each trigger an immediate follow-up message via `triggerTurn: true`. This causes:

1. **Multiple unnecessary turns**: N completed jobs = N follow-up turns
2. **Agent looping**: Agent repeatedly checks "I have already seen this data" for each job

Example flow:
```
1. Agent starts jobs A, B, C (background)
2. Agent does other work (read files, think, etc.)
3. Job A completes → immediate follow-up triggered
4. Agent turn: "Job A completed" → processes it → concludes
5. Job B completes → immediate follow-up triggered  
6. Agent turn: "Job B completed" → processes it → concludes
7. Job C completes → immediate follow-up triggered
8. Agent turn: "Job C completed" → processes it → concludes
```

Desired behavior:
```
1. Agent starts jobs A, B, C (background)
2. Agent does other work
3. Jobs A, B, C complete (no immediate triggers)
4. Agent concludes turn
5. Single follow-up: "Jobs A, B, C completed"
6. Agent processes all at once
```

## Root Cause

The `onJobComplete` callback in SDK immediately calls:
```typescript
session.sendCustomMessage(
    { ... },
    { deliverAs: "followUp", triggerTurn: true }
);
```

Each completion immediately interrupts with a new turn.

## Solution: Turn-End Batching (Option B)

Move delivery triggering from **per-job completion time** to **turn end time**.

### Key Insight

The agent loop already has a turn-end hook: `config.getFollowUpMessages()` (in `agent-loop.ts`). The SDK can use this to batch and deliver all pending job completions as a single grouped message.

### Architecture Change

```
Current:
  Job completes → onJobComplete → sendCustomMessage(triggerTurn=true) → immediate turn

New:
  Job completes → SDK accumulates in pending array → (no trigger)
  Turn ends → getFollowUpMessages() checks pending → sends batched message (if any) → single turn
```

## Implementation

### 1. Modify SDK Job Completion Handler

**File**: `packages/coding-agent/src/sdk.ts`

Change the `onJobComplete` callback to accumulate instead of trigger:

```typescript
const asyncJobManager = backgroundJobsEnabled
    ? new AsyncJobManager({
            maxRunningJobs: asyncMaxJobs,
            onJobComplete: async (jobId, result, job) => {
                // Don't trigger immediately - just accumulate
                // The actual delivery happens in getFollowUpMessages
                pendingJobCompletions.push({ jobId, result, job });
            },
        })
    : undefined;
```

### 2. Add Pending Accumulator

**File**: `packages/coding-agent/src/sdk.ts` (in `runAgentSession`)

```typescript
// Accumulator for completed jobs pending delivery
interface PendingJobCompletion {
    jobId: string;
    result: string;
    job?: AsyncJob;
}
const pendingJobCompletions: PendingJobCompletion[] = [];
```

### 3. Add Batched Delivery Function

**File**: `packages/coding-agent/src/sdk.ts`

```typescript
async function flushPendingJobCompletions(): Promise<void> {
    if (pendingJobCompletions.length === 0 || !session) return;
    
    if (pendingJobCompletions.length === 1) {
        // Single job - use existing single format
        const { jobId, result, job } = pendingJobCompletions[0]!;
        const formattedResult = await formatAsyncResultForFollowUp(result);
        const message = prompt.render(asyncResultTemplate, { jobId, result: formattedResult });
        const durationMs = job ? Math.max(0, Date.now() - job.startTime) : undefined;
        await session.sendCustomMessage(
            {
                customType: "async-result",
                content: message,
                display: true,
                attribution: "agent",
                details: { jobId, type: job?.type, label: job?.label, durationMs },
            },
            { deliverAs: "followUp", triggerTurn: true },
        );
    } else {
        // Multiple jobs - batched format
        const jobInfos = await Promise.all(
            pendingJobCompletions.map(async ({ jobId, result, job }) => ({
                jobId,
                result: await formatAsyncResultForFollowUp(result),
                type: job?.type,
                label: job?.label,
                durationMs: job ? Math.max(0, Date.now() - job.startTime) : undefined,
            }))
        );
        
        const message = prompt.render(asyncResultsBatchTemplate, { jobs: jobInfos });
        await session.sendCustomMessage(
            {
                customType: "async-results-batch",
                content: message,
                display: true,
                attribution: "agent",
                details: { count: jobInfos.length, jobs: jobInfos },
            },
            { deliverAs: "followUp", triggerTurn: true },
        );
    }
    
    pendingJobCompletions.length = 0;
}
```

### 4. Create Batch Template

**File**: `packages/coding-agent/src/prompts/async-results-batch.md` (new)

```markdown
Background jobs completed ({{count}}):

{{#each jobs}}
**{{jobId}}** [{{type}}] — {{label}} ({{durationMs}}ms)
```{{result}}```

{{/each}}
```

### 5. Hook into Turn End

**File**: `packages/coding-agent/src/sdk.ts` (in agent config)

Modify the `getFollowUpMessages` callback to include job completions:

```typescript
const agentConfig: AgentConfig = {
    // ... existing config ...
    
    getFollowUpMessages: async () => {
        // First, flush any pending job completions
        await flushPendingJobCompletions();
        
        // Then return normal follow-up messages
        return agent.dequeueFollowUpMessages();
    },
};
```

### 6. Remove Delivery Loop Trigger

**File**: `packages/coding-agent/src/async/job-manager.ts`

The delivery loop currently calls `onJobComplete` which triggers immediately. With batching, this changes:

Option A: Remove `onJobComplete` callback entirely, just track state
Option B: Keep callback but don't trigger (just for logging/metrics)

Recommended: **Option A** — simplify the manager:

```typescript
// Remove onJobComplete from AsyncJobManagerOptions
// Remove #onJobComplete field
// Remove delivery loop entirely — state tracking only

// Add method to get completed (non-acknowledged, non-watched) jobs:
getCompletedJobs(): AsyncJob[] {
    return Array.from(this.#jobs.values()).filter(
        job => job.status !== "running" && !this.#isDeliverySuppressed(job.id)
    );
}
```

Then SDK polls `getCompletedJobs()` at turn end instead of receiving callbacks.

## Files to Modify

| File | Changes |
|------|---------|
| `packages/coding-agent/src/sdk.ts` | Add `pendingJobCompletions` array, `flushPendingJobCompletions()` function, update `getFollowUpMessages` hook |
| `packages/coding-agent/src/prompts/async-results-batch.md` | New template for batched job results |
| `packages/coding-agent/src/async/job-manager.ts` | (Optional) Remove delivery loop, add `getCompletedJobs()` query method |

## Backwards Compatibility

- The batch message uses new `customType: "async-results-batch"` — UI can handle it or fall back to generic display
- Single completions still use existing `customType: "async-result"` format
- No breaking changes to agent behavior, only performance improvement

## Edge Cases

1. **Job completes after turn end, before next turn starts**: `getFollowUpMessages` is called at the start of the next turn, so it will pick up completions that happened in the gap.

2. **Agent awaits some jobs, others complete unawaited**: Phase 1's `watchJobs` prevents delivery for awaited jobs. Only non-watched jobs appear in the batch.

3. **Session ends with pending completions**: `dispose()` should call `flushPendingJobCompletions()` one last time.

4. **Zero pending completions**: `getFollowUpMessages` returns empty array, no turn triggered.

## Testing

1. **Unit test**: Multiple jobs complete during a turn → single `getFollowUpMessages` call returns batch
2. **Integration test**: Agent starts 3 jobs, does work, concludes → single follow-up with all 3 results
3. **Edge case test**: Mix of awaited and non-awaited jobs → only non-awaited appear in batch

## Acceptance Criteria

1. [ ] Multiple background jobs completing during a turn trigger exactly one follow-up
2. [ ] Batched message contains all job results
3. [ ] Single job still works (non-batched format acceptable)
4. [ ] Awaited jobs don't appear in batch (Phase 1 + Phase 2 integration)
5. [ ] No regression in job result formatting or display
