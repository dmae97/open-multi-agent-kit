<critical>
Plan approved. Execute it now.
</critical>

## Plan

{{planContent}}

<instruction>
Execute this plan step by step. You have full tool access.
Verify each step before proceeding to the next.
{{#has tools "todo_write"}}
Before execution, initialize todo tracking for this plan with `todo_write`.
After each completed step, immediately update `todo_write` so progress stays visible.
If a `todo_write` call fails, fix the todo payload and retry before continuing silently.
{{/has}}
</instruction>

<critical>
Keep going until complete. This matters.
</critical>