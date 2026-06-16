# OMK Post-0.79.3 Algorithm Hardening Roadmap

> Package version: `open-multi-agent-kit@0.79.3`  
> Runtime contract family: `v1.2`  
> Release channel: `pre-1.0`  
> Last updated: 2026-06-16

## 1. Current state

OMK v0.79.3 already moved past the "single Kimi wrapper" stage. The following native-orchestrator hardening is already in place:

- `RuntimeHealthVector` and health-aware routing in `RuntimeRouter`.
- Authority policy resolver (`authority`/`primary`/`omk` → concrete provider).
- Evidence-required blocking in `RuntimeBackedTaskRunner` and `CompiledDagExecutor`.
- Advisory-only runtime boundary for API providers (DeepSeek, Kimi API, local-llm, MiMo).
- Native turn risk classifier with confidence/matched-signal trace.
- Per-turn route/result artifacts under `.omk/runs/<runId>/turns/`.
- Headroom compaction guard that preserves required structural context.
- Theme/version sync gate.

This document describes the next stages of algorithm hardening and how to execute them safely.

## 2. Hardening philosophy

1. **Contract-first**: change types and contracts before implementations.
2. **Evidence-driven**: every gate must be replayable; declarations are not evidence.
3. **Runtime-mode authority**: authority belongs to `(provider, runtimeMode)`, not provider identity alone.
4. **Fail-closed by default**: missing authority, missing evidence, or unknown health must block, not fall back silently.
5. **Backward compatible**: existing Kimi chat smoke tests and public CLI behavior must keep passing.
6. **Gradual rollout**: use feature flags, staged tool authority modes (`shadow` → `warn` → `enforce`), and isolated test files.

## 3. Phase roadmap

### Phase 1 — Foundation (contract stabilization)

**Goal**: make authority, safety, and health first-class contracts so later phases do not fight the type system.

| Task | Deliverable | Acceptance |
|------|-------------|------------|
| P1.1 Runtime-mode authority matrix | `src/runtime/authority-matrix.ts` + matrix doc update | Single source of truth; provider-maturity.md aligned |
| P1.2 `AgentTask.safety` elevation | `AgentTask.safety` required field + `capsuleToTask` injection | TypeScript compile fails if adapter ignores safety |
| P1.3 Tri-state health vector v2 | `HealthState` + probe cache + adaptive TTL | Unknown penalized less than fail; all adapters return v2 or unknown |

**Verification**: `npm run check`, `npm run version:check`, existing tests still pass.

### Phase 2 — Evidence semantics v2

**Goal**: separate declared evidence requirements from actual observations.

| Task | Deliverable | Acceptance |
|------|-------------|------------|
| P2.1 Evidence model split | `EvidenceRequirement` vs `EvidenceObservation` types | No function treats declaration as proof |
| P2.2 Observation extraction | Extractors for metadata/stdout/artifact/file | Each observation has timestamp, source, replay flag, redaction flag |
| P2.3 Runtime evidence gate v2 | `RuntimeBackedTaskRunner` uses observations | Pre-check is declaration-only; post-check is observation-based |
| P2.4 DAG executor alignment | `CompiledDagExecutor` uses same observation model | `checkNodeEvidence` returns observations, not gate marks |

**Verification**: New negative tests: missing observation → exit 78; declared gate without observation → not satisfied.

### Phase 3 — Observability and audit

**Goal**: make every turn replayable and auditable through graph memory and private artifacts.

| Task | Deliverable | Acceptance |
|------|-------------|------------|
| P3.1 Prompt payload separation | `DagNode.name` is a redacted label; full prompt stored privately | Public summary contains no compiled prompt |
| P3.2 Turn audit graph materialization | Turn/ProviderRoute/Evidence nodes in local graph | Query `run → provider → evidence` works |
| P3.3 Replay index with artifact hashes | `.omk/runs/<runId>/replay-index.json` | All artifact refs are hash-matched |

**Verification**: `omk graph view` shows audit nodes; replay index validates against filesystem.

### Phase 4 — Release gate hardening

**Goal**: make authority and evidence failures part of the release pipeline.

| Task | Deliverable | Acceptance |
|------|-------------|------------|
| P4.1 Tool-authority enforce smoke matrix | `scripts/authority-smoke.mjs` | enforce/warn/shadow cases pass |
| P4.2 Health-degraded routing tests | Tests for unknown/fail health states | Routing scores reflect tri-state correctly |
| P4.3 Evidence-v2 negative tests | Missing observation tests | Failures produce exit 78 + diagnostic |
| P4.4 CI integration | GitHub Actions runs authority smoke | CI fails on authority regression |

**Verification**: `npm run release:check` includes new smoke matrix.

## 4. Dependency graph

```text
P1.1 authority matrix
    ├── P1.2 safety contract
    │       ├── P2.1 evidence model split
    │       │       ├── P2.3 runtime evidence gate v2
    │       │       ├── P2.4 DAG executor alignment
    │       │       ├── P3.1 prompt payload separation
    │       │       └── P3.2 audit graph materialization
    │       └── P4.1 tool-authority enforce smoke
    └── P1.3 health vector v2
            └── P4.2 health-degraded routing tests
```

## 5. Rollback strategy

- Each phase lives in a separate feature branch or at minimum a separate commit.
- Phase 1 changes are foundational; if they break main, revert immediately and re-plan.
- Phases 2–4 can be toggled via environment flags if implementations are feature-flagged:
  - `OMK_EVIDENCE_MODEL=v2`
  - `OMK_HEALTH_VECTOR=v2`
  - `OMK_PROMPT_PAYLOAD=private`
- Keep existing tests green; add new tests for new behavior; never delete old tests until a full release passes.

## 6. Success criteria

1. `npm run check` passes after every phase.
2. `npm run release:check` passes after Phase 4.
3. All new negative tests pass.
4. Provider-maturity.md and hardening.md reflect runtime-mode authority.
5. No compiled prompt appears in public graph nodes or run summaries.
6. Every high-risk turn leaves replayable evidence artifacts.

## 7. Related documents

- `docs/native-root-runtime-hardening.md`
- `docs/provider-maturity.md`
- `docs/algorithm-hardening-playbook.md`
- `.omk/runs/post-0793-hardening-2026-06-16/orchestration-spec.md`
