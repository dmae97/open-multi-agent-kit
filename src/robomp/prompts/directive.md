# Directive on {{repo.full_name}}#{{inbound.number}} ({{inbound.kind}})

**@{{directive.author}}** posted an authoritative directive on this
{{inbound.kind}} thread ({{origin.description}}). They're either a maintainer
who tagged you (`@bot`) or a configured reviewer bot whose comments you treat
as binding. Current PR state:
`{{state.pr_status}}`. The directive overrides any prior plan or seed
todos.

---

## Prior conversation

{{thread}}

---

## Directive from @{{directive.author}} ({{comment.created_at}})

{{directive.body}}

---

## What to do

Read the conversation above before acting — the directive is often a
delta on top of context the thread already establishes (especially when
the author is a reviewer bot like `chatgpt-codex-connector` whose review
text references prior comments by line).

Then branch on the kind of request:

- **Code change requested** → commit on `{{workspace.branch}}` (do NOT
  open a second PR — push to this branch). `gh_push_branch` (and
  `gh_open_pr`) run `bun run fix` and `bun check` deterministically
  before contacting the remote; you don't need to. After pushing, reply
  with a single `gh_post_comment` summarizing what changed, one line per
  concrete fix. If the directive cites multiple issues (e.g. several
  inline review comments), address each one and group them in the reply.
- **Question / clarification** → answer with a single `gh_post_comment`.
  No code change.
- **Explicit "stop" / "drop this"** → reply once acknowledging, then
  halt.
- **Ambiguous request** → reply with exactly one clarifying question
  and stop. Do not guess.

You may amend or replace prior commits as long as the final state on
`{{workspace.branch}}` matches what the directive asks for.

All side effects go through the `gh_*` host tools. NEVER shell out to `gh`
or `git push`. `classify_issue` and `set_issue_labels` are not available on
this thread — the originating issue is already triaged.

Terse. Technical. No emoji.
