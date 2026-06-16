# OMK Algorithm Hardening Playbook

> How to evolve OMK's runtime algorithms safely, contract-first, and with evidence.

## 1. Principles

### 1.1 Change contracts before code

When hardening an algorithm, start with:

1. Type/interface changes (e.g., `AgentTask.safety`, `RuntimeHealthVectorV2`).
2. Unit tests that express the new contract in isolation.
3. Adapter updates to satisfy the compiler.
4. Integration tests.
5. Documentation updates.

This order catches contract violations at compile time rather than at runtime.

### 1.2 Declare, observe, then verify

For evidence gates:

- **Declare**: node/task says what evidence kinds are required.
- **Observe**: after execution, extract actual observations from stdout, metadata, artifacts.
- **Verify**: compare observations against declarations.

A declaration is never proof.

### 1.3 Runtime-mode authority

Authority is not provider identity. It is `(provider, runtimeMode)`:

```text
kimi:api   → read, review (advisory)
kimi:cli   → read, write, patch, shell, merge, review (authority)
deepseek:api → read, review (advisory)
codex:cli  → read, plan, review (advisory unless explicit policy)
```

Any code path that selects a runtime must consult this matrix.

### 1.4 Fail-closed defaults

- Unknown health → route with penalty or block.
- Missing evidence → exit 78.
- Advisory runtime asked to write/shell/merge → exit 78.
- Low-confidence risk → downgrade to `ask`.

### 1.5 Preserve backward compatibility

- Do not remove old fields until the full phase is released.
- Use optional/new fields first, then deprecate.
- Keep existing smoke tests passing.

## 2. Step-by-step hardening loop

### Step 0 — Isolate the concern

Pick one algorithm concern per phase:

- evidence semantics
- health probes
- authority matrix
- prompt privacy
- audit graph

Do not mix two concerns in one diff.

### Step 1 — Specify the contract

Write the LaTeX/TypeScript contract first. Example:

```ts
// Before changing implementations, add the new contract.
export interface AgentTaskSafety {
  readonly risk: string;
  readonly approvalPolicy: string;
  readonly sandboxMode: string;
  readonly evidenceRequired: boolean;
  readonly authorityMode: string;
}
```

### Step 2 — Add isolated tests

Create a new test file that fails before implementation:

```text
test/evidence-v2-declared-vs-observed.test.mjs
test/health-vector-tri-state.test.mjs
test/authority-matrix-kimi-api-advisory.test.mjs
```

### Step 3 — Implement behind a flag when possible

For large changes, use an environment flag:

```ts
const evidenceModelV2 = process.env.OMK_EVIDENCE_MODEL === "v2";
```

This lets you merge incrementally without breaking existing paths.

### Step 4 — Update adapters incrementally

For each runtime adapter:

1. Make it compile with the new contract.
2. Add a focused test for that adapter.
3. Move to the next adapter.

### Step 5 — Integrate and remove flag

Once all adapters and tests pass:

1. Default the flag to the new behavior.
2. Add a revert path.
3. Run full quality gates.

### Step 6 — Document and release-gate

- Update `docs/provider-maturity.md`, `docs/native-root-runtime-hardening.md`.
- Add the new behavior to `release:check` or a dedicated smoke script.
- Update `CHANGELOG.md`.

## 3. Parallel subagent orchestration

When spawning parallel workers (when the tool is available):

### 3.1 Decompose by concern, not by file

Each worker owns one concern end-to-end:

- evidence worker: contract + tests + runtime-backed + DAG executor
- health worker: vector v2 + adapters + scoring
- authority worker: matrix + resolver + docs + smoke

### 3.2 Grant least privilege

| Worker | Authority | Allowed paths | Blocked paths |
|--------|-----------|---------------|---------------|
| evidence | write-scoped | `src/runtime/contracts/evidence.ts`, `src/runtime/runtime-backed-task-runner.ts`, `src/orchestration/executor.ts`, `test/evidence-*.mjs` | secrets, env files |
| health | write-scoped | `src/runtime/contracts/shared.ts`, `src/runtime/runtime-router.ts`, `src/runtime/*-runtime.ts`, `test/health-*.mjs` | secrets, env files |
| authority | write-scoped | `src/runtime/authority-matrix.ts`, `src/runtime/runtime-bootstrap.ts`, `src/runtime/runtime-router.ts`, `docs/provider-maturity.md`, `test/authority-*.mjs` | secrets, env files |

### 3.3 Shared read-only reviewers

Run reviewer/QA/security lanes in parallel after implementation lanes:

- `omk-reviewer`: diff review, type safety
- `omk-tester`: test matrix, release gate
- `omk-security`: secret exposure, authority boundary

### 3.4 Synthesis gate

Do not merge until:

1. Every lane produced evidence.
2. `npm run check` passes.
3. `npm run release:check` passes.
4. New negative tests pass.
5. Documentation is updated.

## 4. Regression prevention

### 4.1 Test hierarchy

1. **Contract tests**: pure functions, no IO.
2. **Adapter tests**: runtime mocks, no live provider calls.
3. **Integration tests**: local CLI with `--dry-run`.
4. **Smoke tests**: real provider only in CI with ephemeral keys.

### 4.2 Required negative tests

For every new gate, add a negative test:

- Evidence declared but not observed → blocked.
- Health fail → runtime excluded or penalized.
- Advisory runtime asked for write → exit 78.
- Private prompt leaked to public node → redaction/failure.

### 4.3 Durable checkpoints

Before each phase:

```bash
git branch phase-<N>-<concern>
npm run check
npm run test
```

After each phase:

```bash
npm run check
npm run release:check
git commit -m "feat(<concern>): <phase N> hardening"
```

## 5. When to stop

Stop a phase and ask for guidance when:

- A contract change would break public CLI behavior.
- A runtime adapter cannot satisfy the new contract without a large refactor.
- `npm run check` fails and the fix is not local.
- A lane would need to write files outside its granted scope.

## 6. Checklist

- [ ] Contract specified in TypeScript/LaTeX
- [ ] Isolated failing tests added
- [ ] Implementation behind flag or in isolated file
- [ ] All adapters updated incrementally
- [ ] Negative tests added
- [ ] Documentation updated
- [ ] Quality gates pass
- [ ] Evidence artifacts recorded
- [ ] Result artifact written
