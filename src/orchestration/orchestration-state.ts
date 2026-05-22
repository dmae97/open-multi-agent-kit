/**
 * OrchestrationStateManager — 병렬 오케스트레이션 상태 관리
 *
 * 기존 RunState와 StatePersister를 활용하여 워커 상태, 이벤트, 조정 상태를 관리합니다.
 */

import type { RunState, TaskResult } from "../contracts/orchestration.js";
import type { DagNode } from "./dag.js";
import { createStatePersister, type StatePersister } from "./state-persister.js";
import { createRoutedRunState } from "./run-state.js";

export type WorkerStatus = "idle" | "running" | "completed" | "failed" | "retrying";

export interface WorkerState {
  nodeId: string;
  status: WorkerStatus;
  retryCount: number;
  maxRetries: number;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  result?: TaskResult;
  error?: string;
  assignment?: {
    skills: string[];
    mcpServers: string[];
    hooks: string[];
  };
}

export interface OrchestrationEvent {
  type: "worker_started" | "worker_completed" | "worker_failed" | "worker_retrying" | "batch_completed" | "orchestration_completed";
  nodeId?: string;
  batchIndex?: number;
  timestamp: string;
  data?: Record<string, unknown>;
}

export interface OrchestrationState {
  runId: string;
  status: "initializing" | "running" | "paused" | "completed" | "failed" | "cancelled";
  workers: Map<string, WorkerState>;
  events: OrchestrationEvent[];
  completedNodes: Set<string>;
  startedAt: string;
  completedAt?: string;
}

export interface StateManagerOptions {
  runId: string;
  nodes: DagNode[];
  workerCount: number;
  goalId?: string;
  goalSnapshot?: RunState["goalSnapshot"];
  basePath?: string;
}

export class OrchestrationStateManager {
  private state: OrchestrationState;
  private persister: StatePersister;
  private runState: RunState;
  private orchestrationError?: string;

  constructor(options: StateManagerOptions) {
    this.persister = createStatePersister(options.basePath ?? ".omk/runs");

    this.state = {
      runId: options.runId,
      status: "initializing",
      workers: new Map(),
      events: [],
      completedNodes: new Set(),
      startedAt: new Date().toISOString(),
    };

    this.runState = createRoutedRunState({
      runId: options.runId,
      startedAt: this.state.startedAt,
      nodes: options.nodes,
      workerCount: options.workerCount,
      goalId: options.goalId,
      goalSnapshot: options.goalSnapshot,
    });
  }

  /**
   * 워커 상태 초기화
   */
  initializeWorker(nodeId: string, maxRetries: number): void {
    this.state.workers.set(nodeId, {
      nodeId,
      status: "idle",
      retryCount: 0,
      maxRetries,
    });
  }

  /**
   * 워커 시작
   */
  startWorker(nodeId: string, assignment?: WorkerState["assignment"]): void {
    const worker = this.state.workers.get(nodeId);
    if (!worker) throw new Error(`Worker ${nodeId} not found`);

    worker.status = "running";
    worker.startedAt = new Date().toISOString();
    worker.assignment = assignment;

    // RunState의 노드 상태 업데이트
    const node = this.runState.nodes.find((n) => n.id === nodeId);
    if (node) {
      node.status = "running";
      node.startedAt = worker.startedAt;
    }

    this.addEvent({
      type: "worker_started",
      nodeId,
      timestamp: worker.startedAt,
      data: { assignment },
    });
  }

  /**
   * 워커 완료
   */
  completeWorker(nodeId: string, result: TaskResult): void {
    const worker = this.state.workers.get(nodeId);
    if (!worker) throw new Error(`Worker ${nodeId} not found`);

    const completedAt = new Date().toISOString();
    const durationMs = worker.startedAt
      ? new Date(completedAt).getTime() - new Date(worker.startedAt).getTime()
      : 0;

    worker.status = result.success ? "completed" : "failed";
    worker.completedAt = completedAt;
    worker.durationMs = durationMs;
    worker.result = result;

    if (result.success) {
      this.state.completedNodes.add(nodeId);
    }

    // RunState의 노드 상태 업데이트
    const node = this.runState.nodes.find((n) => n.id === nodeId);
    if (node) {
      node.status = result.success ? "done" : "failed";
      node.completedAt = completedAt;
      node.durationMs = durationMs;
      node.retries = worker.retryCount;
    }

    this.addEvent({
      type: "worker_completed",
      nodeId,
      timestamp: completedAt,
      data: { success: result.success, durationMs },
    });
  }

  /**
   * 워커 재시도
   */
  retryWorker(nodeId: string): boolean {
    const worker = this.state.workers.get(nodeId);
    if (!worker) throw new Error(`Worker ${nodeId} not found`);

    if (worker.retryCount >= worker.maxRetries) {
      return false;
    }

    worker.retryCount++;
    worker.status = "retrying";
    worker.startedAt = undefined;
    worker.completedAt = undefined;
    worker.durationMs = undefined;
    worker.result = undefined;

    // RunState의 노드 상태 업데이트
    const node = this.runState.nodes.find((n) => n.id === nodeId);
    if (node) {
      node.status = "pending";
      node.retries = worker.retryCount;
    }

    this.addEvent({
      type: "worker_retrying",
      nodeId,
      timestamp: new Date().toISOString(),
      data: { retryCount: worker.retryCount },
    });

    return true;
  }

  /**
   * 워커 실패 (재시도 불가)
   */
  failWorker(nodeId: string, error: string): void {
    const worker = this.state.workers.get(nodeId);
    if (!worker) throw new Error(`Worker ${nodeId} not found`);

    worker.status = "failed";
    worker.completedAt = new Date().toISOString();
    worker.error = error;

    // RunState의 노드 상태 업데이트
    const node = this.runState.nodes.find((n) => n.id === nodeId);
    if (node) {
      node.status = "failed";
      node.completedAt = worker.completedAt;
    }

    this.addEvent({
      type: "worker_failed",
      nodeId,
      timestamp: worker.completedAt!,
      data: { error },
    });
  }

  /**
   * 배치 완료
   */
  completeBatch(batchIndex: number, nodeIds: string[]): void {
    this.addEvent({
      type: "batch_completed",
      batchIndex,
      timestamp: new Date().toISOString(),
      data: { nodeIds },
    });
  }

  /**
   * 오케스트레이션 완료
   */
  complete(success: boolean): void {
    this.state.status = success ? "completed" : "failed";
    this.state.completedAt = new Date().toISOString();
    this.runState.completedAt = this.state.completedAt;

    this.addEvent({
      type: "orchestration_completed",
      timestamp: this.state.completedAt,
      data: { success },
    });
  }

  /**
   * 워커 상태 조회
   */
  getWorker(nodeId: string): WorkerState | undefined {
    return this.state.workers.get(nodeId);
  }

  /**
   * 모든 워커 상태 조회
   */
  getAllWorkers(): WorkerState[] {
    return Array.from(this.state.workers.values());
  }

  /**
   * 실행 중인 워커 수
   */
  getRunningWorkerCount(): number {
    return this.getAllWorkers().filter((w) => w.status === "running").length;
  }

  /**
   * 완료된 워커 수
   */
  getCompletedWorkerCount(): number {
    return this.getAllWorkers().filter((w) => w.status === "completed").length;
  }

  /**
   * 실패한 워커 수
   */
  getFailedWorkerCount(): number {
    return this.getAllWorkers().filter((w) => w.status === "failed").length;
  }

  /**
   * 이벤트 조회
   */
  getEvents(): OrchestrationEvent[] {
    return [...this.state.events];
  }

  /**
   * RunState 조회
   */
  getRunState(): RunState {
    return { ...this.runState };
  }

  /**
   * 상태 저장
   */
  async save(): Promise<void> {
    await this.persister.save(this.runState);
  }

  /**
   * 상태 로드
   */
  async load(): Promise<boolean> {
    const loaded = await this.persister.load(this.state.runId);
    if (loaded) {
      this.runState = loaded;
      // 워커 상태 복원
      for (const node of loaded.nodes) {
        this.state.workers.set(node.id, {
          nodeId: node.id,
          status: node.status === "done" ? "completed" : node.status === "failed" ? "failed" : node.status === "running" ? "running" : "idle",
          retryCount: node.retries ?? 0,
          maxRetries: node.maxRetries ?? 3,
          startedAt: node.startedAt,
          completedAt: node.completedAt,
          durationMs: node.durationMs,
        });
        if (node.status === "done") {
          this.state.completedNodes.add(node.id);
        }
      }
      return true;
    }
    return false;
  }

  /**
   * 이벤트 추가
   */
  private addEvent(event: OrchestrationEvent): void {
    this.state.events.push(event);
  }

  /**
   * 상태 조회
   */
  getStatus(): OrchestrationState["status"] {
    return this.state.status;
  }

  getStartedAt(): string {
    return this.state.startedAt;
  }

  getCompletedAt(): string | undefined {
    return this.state.completedAt;
  }

  getError(): string | undefined {
    if (this.orchestrationError) {
      return this.orchestrationError;
    }
    for (const worker of this.state.workers.values()) {
      if (worker.status === "failed" && worker.error) {
        return worker.error;
      }
    }
    return undefined;
  }

  /**
   * 초기화
   */
  initialize(): void {
    this.state.status = "running";
  }

  /**
   * 상태 설정
   */
  setStatus(status: OrchestrationState["status"]): void {
    this.state.status = status;
  }

  setCompletedAt(completedAt: string): void {
    this.state.completedAt = completedAt;
  }

  setError(error: string): void {
    this.orchestrationError = error;
  }

  /**
   * 이벤트 발생
   */
  emitEvent(event: OrchestrationEvent): void {
    this.addEvent(event);
  }

  /**
   * 상태 요약 출력
   */
  formatSummary(): string {
    const workers = this.getAllWorkers();
    const running = workers.filter((w) => w.status === "running");
    const completed = workers.filter((w) => w.status === "completed");
    const failed = workers.filter((w) => w.status === "failed");
    const idle = workers.filter((w) => w.status === "idle");

    const lines: string[] = [];
    lines.push("📊 Orchestration Status");
    lines.push("─".repeat(50));
    lines.push(`Run ID: ${this.state.runId}`);
    lines.push(`Status: ${this.state.status}`);
    lines.push(`Started: ${this.state.startedAt}`);
    if (this.state.completedAt) {
      lines.push(`Completed: ${this.state.completedAt}`);
    }
    lines.push("");
    lines.push(`Workers: ${workers.length} total`);
    lines.push(`  🟢 Completed: ${completed.length}`);
    lines.push(`  🔵 Running: ${running.length}`);
    lines.push(`  ⚪ Idle: ${idle.length}`);
    lines.push(`  🔴 Failed: ${failed.length}`);
    lines.push("");

    if (running.length > 0) {
      lines.push("Running Workers:");
      for (const worker of running) {
        lines.push(`  • ${worker.nodeId} (retry: ${worker.retryCount}/${worker.maxRetries})`);
      }
      lines.push("");
    }

    if (failed.length > 0) {
      lines.push("Failed Workers:");
      for (const worker of failed) {
        lines.push(`  • ${worker.nodeId}: ${worker.error ?? "Unknown error"}`);
      }
    }

    return lines.join("\n");
  }
}
