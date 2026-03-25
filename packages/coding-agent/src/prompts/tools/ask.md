Asks user when you need clarification or input during task execution.

<conditions>
- Multiple approaches exist with significantly different tradeoffs user should weigh
</conditions>

<instruction>
- Use `recommended: <index>` to mark default (0-indexed); " (Recommended)" added automatically
- Use `questions` for multiple related questions instead of asking one at a time
- Set `multi: true` on question to allow multiple selections
- Set `multiline: true` on a question to open a multiline editor when the user selects "Other (type your own)"
- In multiline mode: Enter inserts newline, Ctrl+Enter submits, Esc cancels
- `ask.timeout` only applies while choosing options; once the user enters custom input mode (single-line or multiline), there is no timeout
</instruction>

<caution>
- Provide 2-5 concise, distinct options
</caution>

<critical>
- **Default to action.** Resolve ambiguity yourself using repo conventions, existing patterns, and reasonable defaults. Exhaust existing sources (code, configs, docs, history) before asking. Only ask when options have materially different tradeoffs the user must decide.
- **If multiple choices are acceptable**, pick the most conservative/standard option and proceed; state the choice.
- **Do NOT include "Other" option** — UI automatically adds "Other (type your own)" to every question.
</critical>

<example name="single">
question: "Which authentication method should this API use?"
options: [{"label": "JWT"}, {"label": "OAuth2"}, {"label": "Session cookies"}]
recommended: 0
</example>

<example name="multiline">
question: "Describe the changes you want"
options: [{"label": "Refactor only"}, {"label": "Add tests"}, {"label": "Full rewrite"}]
multiline: true
recommended: 1
</example>