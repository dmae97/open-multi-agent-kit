import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { getProjectRoot } from "../util/fs.js";
import { createGoalPersister } from "./persistence.js";
import { loadWakePolicy, type WakePolicy } from "./wake-policy.js";
import type { GoalSpec, GoalHistoryEntry } from "../contracts/goal.js";
import { updateGoalStatus } from "./intake.js";

export interface GoalDaemonOptions {
  maxIterations?: number;
  maxWallClockHours?: number;
  maxDailyCostUsd?: number;
  maxConsecutiveFailures?: number;
  intervalMs?: number;
  provider?: string;
  approvalPolicy?: string;
  onVerify: (goalId: string) => Promise<void>;
  onContinue: (goalId: string, options: { provider?: string; approvalPolicy?: string }) => Promise<void>;
  onBlock: (goalId: string, reason: string) => Promise<void>;
}

interface DaemonInstance {
  goalId: string;
  options: GoalDaemonOptions;
  timeoutId: ReturnType<typeof setTimeout> | null;
  startTime: number;
  iterationCount: number;
  consecutiveFailures: number;
  isRunningLoop: boolean;
  stopped: boolean;
  sleeping: boolean;
  pendingWake: boolean;
  intervalMs: number;
  lastRunAt: number | null;
}

interface DaemonStateFile {
  schemaVersion: 1;
  goalId: string;
  running: boolean;
  startTime: string;
  iterationCount: number;
  consecutiveFailures: number;
  lastWakeReason?: string;
  lastRunAt?: string;
  sleeping: boolean;
}

const INACTIVE_STATUSES: GoalSpec["status"][] = ["done", "closed", "failed", "cancelled"];

function getDaemonStatePath(goalId: string): string {
  return join(getProjectRoot(), ".omk", "goals", goalId, "daemon-state.json");
}

async function saveDaemonState(instance: DaemonInstance, wakeReason?: string): Promise<void> {
  const state: DaemonStateFile = {
    schemaVersion: 1,
    goalId: instance.goalId,
    running: !instance.stopped && !instance.sleeping,
    startTime: new Date(instance.startTime).toISOString(),
    iterationCount: instance.iterationCount,
    consecutiveFailures: instance.consecutiveFailures,
    sleeping: instance.sleeping,
  };
  if (wakeReason) {
    state.lastWakeReason = wakeReason;
  }
  if (instance.lastRunAt) {
    state.lastRunAt = new Date(instance.lastRunAt).toISOString();
  }
  const path = getDaemonStatePath(instance.goalId);
  await mkdir(join(getProjectRoot(), ".omk", "goals", instance.goalId), { recursive: true });
  await writeFile(path, JSON.stringify(state, null, 2), "utf-8");
}

async function appendDaemonHistory(goalId: string, entry: GoalHistoryEntry): Promise<void> {
  const persister = createGoalPersister(join(getProjectRoot(), ".omk", "goals"));
  await persister.appendHistory(goalId, entry);
}

export class GoalDaemon {
  private instances = new Map<string, DaemonInstance>();

  start(goalId: string, options: GoalDaemonOptions): boolean {
    if (this.instances.has(goalId)) {
      return false;
    }
    const instance: DaemonInstance = {
      goalId,
      options,
      timeoutId: null,
      startTime: Date.now(),
      iterationCount: 0,
      consecutiveFailures: 0,
      isRunningLoop: false,
      stopped: false,
      sleeping: false,
      pendingWake: false,
      intervalMs: options.intervalMs ?? 6 * 60 * 60 * 1000,
      lastRunAt: null,
    };
    this.instances.set(goalId, instance);
    void saveDaemonState(instance);
    void appendDaemonHistory(goalId, {
      at: new Date().toISOString(),
      action: "daemon-start",
      detail: { intervalMs: instance.intervalMs },
    });
    this.scheduleLoop(instance, 0);
    return true;
  }

  stop(goalId: string): boolean {
    const instance = this.instances.get(goalId);
    if (!instance) {
      return false;
    }
    instance.stopped = true;
    if (instance.timeoutId) {
      clearTimeout(instance.timeoutId);
      instance.timeoutId = null;
    }
    this.instances.delete(goalId);
    void appendDaemonHistory(goalId, {
      at: new Date().toISOString(),
      action: "daemon-stop",
      detail: { iterationCount: instance.iterationCount, consecutiveFailures: instance.consecutiveFailures },
    });
    return true;
  }

  isRunning(goalId: string): boolean {
    return this.instances.has(goalId);
  }

  wake(goalId: string, reason?: string): boolean {
    const instance = this.instances.get(goalId);
    if (!instance) {
      return false;
    }
    instance.sleeping = false;
    if (instance.timeoutId) {
      clearTimeout(instance.timeoutId);
      instance.timeoutId = null;
    }
    void appendDaemonHistory(goalId, {
      at: new Date().toISOString(),
      action: "daemon-wake",
      detail: { reason: reason ?? "manual" },
    });
    void saveDaemonState(instance, reason ?? "manual");
    this.scheduleLoop(instance, 0);
    return true;
  }

  sleep(goalId: string): boolean {
    const instance = this.instances.get(goalId);
    if (!instance) {
      return false;
    }
    instance.sleeping = true;
    if (instance.timeoutId) {
      clearTimeout(instance.timeoutId);
      instance.timeoutId = null;
    }
    void appendDaemonHistory(goalId, {
      at: new Date().toISOString(),
      action: "daemon-sleep",
      detail: {},
    });
    void saveDaemonState(instance);
    return true;
  }

  getStatus(goalId: string): {
    running: boolean;
    sleeping: boolean;
    iterationCount: number;
    consecutiveFailures: number;
    startTime: number;
    lastRunAt: number | null;
  } | null {
    const instance = this.instances.get(goalId);
    if (!instance) {
      return null;
    }
    return {
      running: !instance.stopped && !instance.sleeping,
      sleeping: instance.sleeping,
      iterationCount: instance.iterationCount,
      consecutiveFailures: instance.consecutiveFailures,
      startTime: instance.startTime,
      lastRunAt: instance.lastRunAt,
    };
  }

  listRunning(): Array<{ goalId: string; status: ReturnType<GoalDaemon["getStatus"]> }> {
    const result: Array<{ goalId: string; status: ReturnType<GoalDaemon["getStatus"]> }> = [];
    for (const [goalId] of this.instances) {
      const status = this.getStatus(goalId);
      if (status) {
        result.push({ goalId, status });
      }
    }
    return result;
  }

  stopAll(): void {
    for (const [goalId] of this.instances) {
      this.stop(goalId);
    }
  }

  private scheduleLoop(instance: DaemonInstance, delay?: number): void {
    if (instance.stopped || instance.sleeping) {
      return;
    }
    const ms = delay ?? instance.intervalMs;
    instance.timeoutId = setTimeout(() => {
      void this.executeLoop(instance);
    }, ms);
  }

  private async executeLoop(instance: DaemonInstance): Promise<void> {
    if (instance.stopped || instance.isRunningLoop) {
      if (instance.isRunningLoop) {
        instance.pendingWake = true;
      }
      return;
    }
    instance.isRunningLoop = true;
    instance.iterationCount++;

    try {
      await this.runLoop(instance);
      instance.consecutiveFailures = 0;
    } catch (err) {
      instance.consecutiveFailures++;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[goal-daemon] Loop error for ${instance.goalId}: ${message}`);
      await appendDaemonHistory(instance.goalId, {
        at: new Date().toISOString(),
        action: "daemon-loop-error",
        detail: { error: message, consecutiveFailures: instance.consecutiveFailures },
      });

      const maxFailures = instance.options.maxConsecutiveFailures ?? 3;
      if (instance.consecutiveFailures >= maxFailures) {
        console.error(`[goal-daemon] Max consecutive failures reached for ${instance.goalId}. Blocking goal.`);
        try {
          await instance.options.onBlock(instance.goalId, `Daemon exceeded max consecutive failures (${maxFailures})`);
        } catch (blockErr) {
          console.error(`[goal-daemon] Failed to block goal ${instance.goalId}: ${blockErr instanceof Error ? blockErr.message : String(blockErr)}`);
        }
        this.stop(instance.goalId);
        return;
      }
    }

    instance.isRunningLoop = false;
    instance.lastRunAt = Date.now();
    await saveDaemonState(instance);

    if (instance.pendingWake && !instance.stopped) {
      instance.pendingWake = false;
      void this.executeLoop(instance);
      return;
    }

    if (!instance.stopped) {
      this.scheduleLoop(instance);
    }
  }

  private async runLoop(instance: DaemonInstance): Promise<void> {
    const persister = createGoalPersister(join(getProjectRoot(), ".omk", "goals"));
    const spec = await persister.load(instance.goalId);
    if (!spec) {
      throw new Error(`Goal not found: ${instance.goalId}`);
    }

    const wakePolicy = await loadWakePolicy(instance.goalId);
    const policy: WakePolicy = wakePolicy ?? {
      schemaVersion: 1,
      goalId: instance.goalId,
      wakeTriggers: [],
      budgets: {
        maxIterations: instance.options.maxIterations ?? 10,
        maxWallClockHours: instance.options.maxWallClockHours ?? 24,
        maxDailyCostUsd: instance.options.maxDailyCostUsd ?? 5,
        maxConsecutiveFailures: instance.options.maxConsecutiveFailures ?? 3,
      },
      approval: {
        write: "interactive",
        shell: "interactive",
        publish: "block",
        secrets: "block",
      },
    };

    // 2. If status is done/closed/failed/cancelled, stop
    if (INACTIVE_STATUSES.includes(spec.status)) {
      console.log(`[goal-daemon] Goal ${instance.goalId} is ${spec.status}. Stopping daemon.`);
      await appendDaemonHistory(instance.goalId, {
        at: new Date().toISOString(),
        action: "daemon-auto-stop",
        detail: { reason: `goal-status-${spec.status}` },
      });
      this.stop(instance.goalId);
      return;
    }

    // 3. If max iterations or wall clock exceeded, stop and block
    if (instance.iterationCount > policy.budgets.maxIterations) {
      const reason = `Max iterations exceeded (${instance.iterationCount} > ${policy.budgets.maxIterations})`;
      console.warn(`[goal-daemon] ${reason} for ${instance.goalId}. Blocking goal.`);
      await instance.options.onBlock(instance.goalId, reason);
      this.stop(instance.goalId);
      return;
    }

    const elapsedHours = (Date.now() - instance.startTime) / (1000 * 60 * 60);
    if (elapsedHours > policy.budgets.maxWallClockHours) {
      const reason = `Max wall-clock hours exceeded (${elapsedHours.toFixed(2)}h > ${policy.budgets.maxWallClockHours}h)`;
      console.warn(`[goal-daemon] ${reason} for ${instance.goalId}. Blocking goal.`);
      await instance.options.onBlock(instance.goalId, reason);
      this.stop(instance.goalId);
      return;
    }

    // 4. Call goalVerifyCommand equivalent
    let verifyPassed = false;
    try {
      await instance.options.onVerify(instance.goalId);
      verifyPassed = true;
    } catch (err) {
      verifyPassed = false;
      const message = err instanceof Error ? err.message : String(err);
      await appendDaemonHistory(instance.goalId, {
        at: new Date().toISOString(),
        action: "daemon-verify-failed",
        detail: { error: message },
      });
    }

    if (verifyPassed) {
      // 5. If verify passes -> mark done, stop
      const updated = updateGoalStatus(spec, "done");
      await persister.save(updated);
      await appendDaemonHistory(instance.goalId, {
        at: new Date().toISOString(),
        action: "daemon-verify-passed",
        detail: {},
      });
      this.stop(instance.goalId);
      return;
    }

    // 6. If verify fails with evidence missing -> call goalContinueCommand equivalent
    try {
      await instance.options.onContinue(instance.goalId, {
        provider: instance.options.provider,
        approvalPolicy: instance.options.approvalPolicy,
      });
      await appendDaemonHistory(instance.goalId, {
        at: new Date().toISOString(),
        action: "daemon-continue",
        detail: { provider: instance.options.provider },
      });
    } catch (err) {
      // 7. If run fails -> increment consecutive failure counter; if >= max, block and stop
      instance.consecutiveFailures++;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[goal-daemon] Continue failed for ${instance.goalId}: ${message}`);
      await appendDaemonHistory(instance.goalId, {
        at: new Date().toISOString(),
        action: "daemon-continue-failed",
        detail: { error: message, consecutiveFailures: instance.consecutiveFailures },
      });

      const maxFailures = policy.budgets.maxConsecutiveFailures;
      if (instance.consecutiveFailures >= maxFailures) {
        console.error(`[goal-daemon] Max consecutive failures reached for ${instance.goalId}. Blocking goal.`);
        await instance.options.onBlock(instance.goalId, `Daemon exceeded max consecutive failures (${maxFailures})`);
        this.stop(instance.goalId);
      }
    }

    // 8. Sleep for interval or wait for manual wake (handled by scheduleLoop)
  }
}

export const defaultGoalDaemon = new GoalDaemon();
