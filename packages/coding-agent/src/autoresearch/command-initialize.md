Set up autoresearch for this intent:

{{intent}}

{{branch_status_line}}

Collected setup:

- benchmark command: `{{benchmark_command}}`
- primary metric: `{{metric_name}}`
- metric unit: `{{metric_unit}}`
- direction: `{{direction}}`
- files in scope:
{{{scope_paths_block}}}
- off limits:
{{{off_limits_block}}}
- constraints:
{{{constraints_block}}}

Explain briefly what autoresearch will do in this repository, then initialize the workspace.

Your first actions:
- write `autoresearch.md`
- record the collected benchmark command, primary metric, metric unit, direction, scope, off-limits list, and constraints in `autoresearch.md`
- optionally write `autoresearch.program.md` when a repo-local playbook would help future resume quality
- define the benchmark entrypoint in `autoresearch.sh`
- optionally add `autoresearch.checks.sh` if correctness or quality needs a hard gate
- run `init_experiment` with the exact collected benchmark command, metric definition, scope paths, off-limits list, and constraints
- run and log the baseline
- keep iterating until interrupted or until the configured iteration cap is reached
