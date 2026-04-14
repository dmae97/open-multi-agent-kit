#!/usr/bin/env python3
"""
Vim edit benchmark: tests the vim tool across models with a simple edit task.
"""
from __future__ import annotations

from edit_benchmark_common import BenchmarkSpec, EDIT_DIFF, EXPECTED_CONTENT, run_benchmark_main


EDIT_PROMPT = f"""\
Use the `read` tool to inspect `test.rs`, then use the `vim` tool to make `test.rs` exactly match the requested change.

Apply this diff:
```diff
{EDIT_DIFF}```

Final expected file content:
```rust
{EXPECTED_CONTENT}```
"""

VIM_BENCHMARK = BenchmarkSpec(
    description="Benchmark vim tool across models with simple edit tasks.",
    workspace_prefix="vim-benchmark",
    tools=("vim", "read"),
    env={"PI_EDIT_VARIANT": "vim", "PI_STRICT_EDIT_MODE": "1"},
    initial_prompt=EDIT_PROMPT,
    retry_instruction="Please try again using the vim tool.",
)


def main() -> int:
    return run_benchmark_main(VIM_BENCHMARK)


if __name__ == "__main__":
    raise SystemExit(main())
