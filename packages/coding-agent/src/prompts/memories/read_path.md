# Memory Guidance
Memory root: {{base_path}}
Operational rules:
1) Read `{{base_path}}/memory_summary.md` first.
2) If needed, inspect `{{base_path}}/MEMORY.md` and `{{base_path}}/skills/*/SKILL.md`.
3) Decision boundary: trust memory for heuristics/process context; trust current repo files, runtime output, and user instruction for factual state and final decisions.
4) Citation policy: when memory changes your plan, cite the memory artifact path you used (for example `memories/skills/<name>/SKILL.md`) and pair it with current-repo evidence before acting.
5) Conflict workflow: if memory disagrees with repo state or user instruction, prefer repo/user, treat memory as stale, proceed with corrected behavior, then update/regenerate memory artifacts through normal execution.
6) Escalate confidence only after repository verification; memory alone is never sufficient proof.
Memory summary:
{{memory_summary}}