import { compileGoalToDagNodes } from "../goal/compiler.js";
import { createGoalSpec } from "../goal/intake.js";
import { createDag } from "../orchestration/dag.js";
import { ParallelOrchestrator, type ParallelOrchestrationResult } from "../orchestration/parallel-orchestrator.js";
import { formatExecutionPlan, createExecutionPlan } from "../orchestration/execution-planner.js";
import { cpus } from "os";

export interface OrchestrateOptions {
  workers?: string;
  timeout?: string;
  dryRun?: boolean;
  output?: string;
  runId?: string;
}

export async function orchestrateCommand(goal: string, options: OrchestrateOptions): Promise<ParallelOrchestrationResult | void> {
  const runId = options.runId ?? new Date().toISOString().replace(/[:.]/g, "-");
  const maxWorkers = parseWorkers(options.workers);
  const timeout = options.timeout ? parseInt(options.timeout, 10) : 600000;

  console.log(`🎯 Orchestrating goal: ${goal}`);
  console.log(`📋 Run ID: ${runId}`);
  console.log(`👷 Max workers: ${maxWorkers}`);
  console.log(`⏱️  Timeout: ${timeout}ms`);
  console.log();

  try {
    // 1. Goal을 DAG로 컴파일
    console.log("📦 Compiling goal to DAG...");
    const dagNodes = await compileGoalToDagNodes(createGoalSpec(goal));
    const dag = createDag({ nodes: dagNodes });
    console.log(`✅ Created ${dag.nodes.length} nodes`);
    console.log();

    // 2. 실행 계획 생성
    const executionPlan = createExecutionPlan({ dag: dag.nodes, maxWorkers });
    console.log("📋 Execution Plan:");
    console.log(formatExecutionPlan(executionPlan));
    console.log();

    // 3. Dry run 모드면 여기서 종료
    if (options.dryRun) {
      console.log("🏁 Dry run complete - no execution");
      return;
    }

    // 4. 병렬 오케스트레이터 생성 및 실행
    console.log("🚀 Starting parallel execution...");
    console.log("─".repeat(60));

    const orchestrator = new ParallelOrchestrator({
      dag,
      runId,
      maxWorkers,
      cwd: process.cwd(),
      timeout,
      onProgress: (state) => {
        const { completed, total, percentage } = state.progress;
        const status = state.status;
        process.stdout.write(`\r📊 Progress: ${completed}/${total} (${percentage.toFixed(1)}%) - ${status}`);
      },
      onLog: (entry) => {
        const timestamp = entry.timestamp.split("T")[1].split(".")[0];
        const prefix = `[${timestamp}] [${entry.workerId.padEnd(12)}]`;
        
        if (entry.level === "error") {
          console.error(`\n❌ ${prefix} ${entry.message}`);
        } else if (entry.level === "warn") {
          console.warn(`\n⚠️  ${prefix} ${entry.message}`);
        } else if (entry.workerId !== "orchestrator") {
          // orchestrator 로그는 이미 출력되므로 스킵
          console.log(`\n${prefix} ${entry.message}`);
        }
      },
    });

    const result = await orchestrator.execute();

    console.log();
    console.log("─".repeat(60));

    // 5. 결과 출력
    if (result.success) {
      console.log("✅ Orchestration completed successfully!");
    } else {
      console.log("❌ Orchestration failed");
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }

    console.log();
    console.log("📊 Summary:");
    console.log(`   Run ID: ${result.state.runId}`);
    console.log(`   Status: ${result.state.status}`);
    console.log(`   Progress: ${result.state.progress.completed}/${result.state.progress.total} (${result.state.progress.percentage.toFixed(1)}%)`);
    console.log(`   Started: ${result.state.startedAt}`);
    if (result.state.completedAt) {
      console.log(`   Completed: ${result.state.completedAt}`);
    }

    // 6. 결과 파일 저장
    if (options.output) {
      const { writeFile } = await import("fs/promises");
      await writeFile(options.output, JSON.stringify(result, null, 2), "utf-8");
      console.log(`   Output: ${options.output}`);
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`❌ Orchestration failed: ${message}`);
    
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    
    process.exit(1);
  }
}

function parseWorkers(workers?: string): number {
  if (!workers || workers === "auto") {
    // CPU 코어 수 기반 자동 계산 (최소 2, 최대 8)
    const cpuCount = cpus().length;
    return Math.min(Math.max(2, cpuCount), 8);
  }
  
  const num = parseInt(workers, 10);
  if (isNaN(num) || num < 1) {
    throw new Error(`Invalid workers value: ${workers}. Must be a positive integer or "auto".`);
  }
  
  return num;
}
