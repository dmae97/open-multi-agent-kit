Pushes a checked-out pull request branch back to its source branch through local git.

<instruction>
- Defaults to the current checked-out git branch
- Uses branch metadata recorded by `gh_pr_checkout` to push back to the contributor fork and PR head branch
- Use `forceWithLease` only when rewriting the branch intentionally
</instruction>

<output>
Returns the local branch, remote, remote branch, and push target that were used.
</output>
