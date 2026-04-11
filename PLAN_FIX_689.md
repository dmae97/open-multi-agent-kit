# Fix Plan for Issue #689: Background Job Delivery Race Condition

## Problem Summary

When an agent uses the `await` tool to wait for background jobs, it receives the job results through the tool result. However, the `AsyncJobManager` also enqueues a "Background job completed" system notice via the `onJobComplete` callback. This happens even when the agent has already processed the data via `await`, causing:

1. **Redundant turns**: The agent is triggered again with information it already processed
2. **Expensive loops**: With multiple background jobs, each triggers an additional turn, causing the agent to repeatedly check "I have already seen this data"

## Root Cause Analysis

The race condition occurs in this sequence:

```
1. Agent starts background jobs A, B, C
2. Agent calls `await` tool waiting for jobs A, B, C
3. Jobs A, B, C complete
4. For each completion:
   - `#enqueueDelivery()` is called immediately
   - Delivery is added to `#deliveries` queue
   - `#suppressedDeliveries` check happens HERE (too early)
5. `await` resolves with results
6. Agent processes data and concludes turn
7. `acknowledgeDeliveries()` is called (too late - deliveries already queued)
8. Delivery loop processes queued deliveries
9. `onJobComplete` callback sends system notice with `triggerTurn: true`
10. Agent receives "Background job completed" and triggers again unnecessarily
```

The core issue: Suppression check happens at **enqueue time**, but by then the `await` hasn't resolved yet. The `acknowledgeDeliveries()` call happens after the await resolves, but deliveries are already queued.

## Solution Overview

Add a mechanism to mark jobs as "being awaited" BEFORE they complete. When jobs complete, check if they were awaited and skip delivery if so.

## Implementation Plan

### Phase 1: Pre-Await Registration System
#### 1.1 Add `watchedJobs` tracking to AsyncJobManager

**File**: `packages/coding-agent/src/async/job-manager.ts`

Add a new private field to track jobs that are currently being awaited:

```typescript
readonly #watchedJobs = new Set<string>();
```

Add methods to manage watched jobs:

```typescript
/**
 * Mark jobs as being actively watched via `await` tool.
 * Jobs watched before they complete will not trigger delivery.
 */
watchJobs(jobIds: string[]): void {
    for (const id of jobIds) {
        this.#watchedJobs.add(id);
    }
}

/**
 * Unwatch jobs after await resolves. Completed unwatched jobs
 * will then be eligible for delivery (if not already acknowledged).
 */
unwatchJobs(jobIds: string[]): void {
    for (const id of jobIds) {
        this.#watchedJobs.delete(id);
    }
}

#isJobWatched(jobId: string): boolean {
    return this.#watchedJobs.has(jobId);
}
```

#### 1.2 Modify `#enqueueDelivery` to check watched status

**File**: `packages/coding-agent/src/async/job-manager.ts`

Update the `#enqueueDelivery` method to also check if a job is being watched:

```typescript
#enqueueDelivery(jobId: string, text: string): void {
    // Skip delivery if: (1) already acknowledged, or (2) currently being awaited
    if (this.#isDeliverySuppressed(jobId) || this.#isJobWatched(jobId)) {
        return;
    }
    // ... rest of method unchanged
}
```

Also update the delivery loop to filter out watched jobs at dequeue time:

```typescript
async #runDeliveryLoop(): Promise<void> {
    while (this.#deliveries.length > 0) {
        const delivery = this.#deliveries[0];
        // Check both suppressed AND watched status
        if (this.#isDeliverySuppressed(delivery.jobId) || this.#isJobWatched(delivery.jobId)) {
            this.#deliveries.shift();
            continue;
        }
        // ... rest of loop unchanged
    }
}
```

#### 1.3 Update AwaitTool to register/unregister watched jobs

**File**: `packages/coding-agent/src/tools/await-tool.ts`

Modify the `execute` method to:

1. Call `watchJobs()` with the job IDs being awaited BEFORE waiting
2. After await resolves, call `unwatchJobs()` on completed jobs (they're already acknowledged)
3. Keep watching jobs that are still running (they'll be delivered when they complete)

```typescript
async execute(...): Promise<AgentToolResult<AwaitToolDetails>> {
    // ... existing code to resolve jobsToWatch ...

    const jobIdsToWatch = jobsToWatch.map(j => j.id);
    
    // Mark these jobs as being watched - this prevents race condition
    // where jobs complete before we start waiting
    manager.watchJobs(jobIdsToWatch);

    try {
        // ... existing wait logic ...

        // Build result and acknowledge completed jobs
        const result = this.#buildResult(manager, jobsToWatch);
        
        // Unwatch completed jobs (they're acknowledged, no need for delivery)
        const completedIds = jobResults
            .filter(j => j.status !== "running")
            .map(j => j.id);
        manager.unwatchJobs(completedIds);
        
        // Jobs still running remain watched - they'll be delivered when complete
        
        return result;
    } catch (error) {
        // Cleanup watched status on error
        manager.unwatchJobs(jobIdsToWatch);
        throw error;
    }
}
```
### Phase 2: Testing

#### 4.1 Add tests for pre-await registration

**File**: `packages/coding-agent/test/async-job-manager.test.ts`

Add tests:

```typescript
test("watched jobs do not trigger onJobComplete callback", async () => {
    const completions: string[] = [];
    const manager = new AsyncJobManager({
        onJobComplete: async (jobId) => {
            completions.push(jobId);
        },
    });

    const jobId = manager.register("bash", "echo hi", async () => "output");
    
    // Watch the job BEFORE it completes
    manager.watchJobs([jobId]);
    
    await manager.waitForAll();
    await manager.drainDeliveries({ timeoutMs: 500 });
    
    // Should NOT have called onJobComplete
    expect(completions).toHaveLength(0);
    expect(manager.getJob(jobId)?.status).toBe("completed");
});

test("unwatched jobs trigger delivery after unwatch", async () => {
    const completions: string[] = [];
    const manager = new AsyncJobManager({
        onJobComplete: async (jobId) => {
            completions.push(jobId);
        },
    });

    const jobId = manager.register("bash", "echo hi", async () => "output");
    
    manager.watchJobs([jobId]);
    await manager.waitForAll();
    
    // Unwatch and trigger delivery check
    manager.unwatchJobs([jobId]);
    
    // Need mechanism to trigger delivery for unwatched jobs
    // Could add manager.checkForPendingDeliveries() method
});
```

#### 4.2 Add integration test for await tool

**File**: `packages/coding-agent/test/tools.test.ts`

Add test verifying that awaited jobs don't trigger follow-up system notices.

---

## Files to Modify

| File | Changes |
|------|---------|
| `packages/coding-agent/src/async/job-manager.ts` | Add `#watchedJobs` set, `watchJobs()`, `unwatchJobs()`, modify `#enqueueDelivery()` and `#runDeliveryLoop()` |
| `packages/coding-agent/src/tools/await-tool.ts` | Call `watchJobs()` before wait, `unwatchJobs()` after |
| `packages/coding-agent/test/async-job-manager.test.ts` | Add tests for watched job behavior |

## Backwards Compatibility

- The `watchJobs`/`unwatchJobs` API is additive - no breaking changes
- Existing code that doesn't use these methods continues to work as before
- Only the `await` tool needs to be updated to use the new API

## Edge Cases to Handle

1. **Job completes before await is called**: Not watched, delivery proceeds normally (correct behavior)
2. **Multiple awaits on same job**: First await watches, subsequent awaits also watch - no conflict
3. **Await cancels mid-wait**: Must unwatch all watched jobs in finally/catch block
4. **Job fails while being awaited**: Watched status prevents error delivery, await returns error in result
5. **Session ends with watched jobs**: Dispose should clear watched jobs set

## Alternative Considered: Simpler Fix

An alternative is to track "already delivered via await" in the job itself:

```typescript
// In AsyncJob interface
interface AsyncJob {
    // ... existing fields
    deliveredViaAwait?: boolean;
}

// In await-tool.ts #buildResult
for (const job of completedJobs) {
    job.deliveredViaAwait = true;
}

// In #enqueueDelivery
if (job?.deliveredViaAwait) return;
```

**Rejected because**: The job state is the wrong place for this - it's a delivery concern, not a job state concern. Also, jobs could be referenced by multiple awaits over time.

## Acceptance Criteria

1. [ ] When agent starts jobs and awaits them, no "Background job completed" follow-up is delivered
2. [ ] When agent starts jobs without awaiting, "Background job completed" is delivered normally
3. [ ] Multiple jobs started together and awaited together don't trigger multiple follow-ups
4. [ ] Jobs that complete while being awaited are delivered normally if not awaited (edge case: await races with completion)
5. [ ] All existing tests pass
6. [ ] New tests cover the watched job behavior
