# Claude Code Guidelines

## Pull Requests

When asked to create a PR, use `gh pr create` with:

- Title: semantic, comparing current branch to main (e.g., "feat: add new hook", "fix: resolve memory leak")
- Use bang notation for breaking changes (e.g., "feat!: important feature")
- Description should be concise and include:
  - Summary of changes
  - **Integration**: how to integrate changes from the SDK into a client app (can be empty if nothing required)
  - **Breaking Changes**: what will break by upgrading the SDK (if any)
- Do not include the "🤖 Generated with Claude Code" footer

## Branches

When asked to create a branch, run `git diff` to analyze the changes, then use `git checkout -b` with a semantic branch name based on the diff (e.g., "feat/add-new-hook", "fix/resolve-memory-leak"). Do not ask the user what the branch should be for.