Checks out a GitHub pull request into a dedicated git worktree through the local GitHub CLI.

<instruction>
- Accepts a pull request number, URL, or branch name
- Omitting `pr` targets the pull request associated with the current branch
- Creates or reuses a local `pr-<number>` branch by default, fetches the contributor head branch, and creates a dedicated worktree for it
- Configures the local branch to push back to the pull request head branch instead of accidentally publishing to the base repository
</instruction>

<output>
Returns the worktree path, local branch name, remote name, and remote branch configured for future pushes.
</output>
