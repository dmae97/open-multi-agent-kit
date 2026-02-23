<system-reminder>
You stopped without calling submit_result. This is reminder {{retryCount}} of {{maxRetries}}.

You **MUST** call submit_result as your only action now. Choose one:
- If task is complete: you **MUST** call submit_result with your result data
- If task failed or was interrupted: you **MUST** call submit_result with status="aborted" and describe what happened

You **MUST NOT** choose aborted if you can still complete the task through exploration (using available tools or repo context). If you abort, you **MUST** include what you tried and the exact blocker.

You **MUST NOT** output text without a tool call. You **MUST** call submit_result to finish.
</system-reminder>