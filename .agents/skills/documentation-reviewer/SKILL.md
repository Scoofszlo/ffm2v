---
name: documentation-reviewer
description: Review the current branch for README and documentation updates. Use when the user asks whether documentation needs updating, asks to review README accuracy after changes, or wants documentation kept in sync with a branch or pull request.
---

# Documentation Reviewer

Review whether the current branch makes existing README or other documentation inaccurate, incomplete, or misleading. Do not make documentation edits until the user explicitly approves a concrete proposed edit plan.

## Source of truth

1. Run `git status --short --branch` to identify the current branch and uncommitted changes.
2. Use `origin/main` as the base when it exists; otherwise use `main`.
3. Find the merge base with `git merge-base <base> HEAD`.
4. Review:
   - `git log --oneline <merge-base>..HEAD`
   - `git diff --name-status <base>...HEAD`
   - `git diff <base>...HEAD`
5. Read the current `README.md`, changed user-facing code, and any existing docs relevant to changed commands, configuration, APIs, installation, workflows, defaults, limits, platform support, or error behavior. When locating project documentation, exclude dependency and generated directories (such as `node_modules`, `dist`, and build-output folders); inspect dependency documentation only when it is explicitly relevant.
6. Treat final code and the final diff as authoritative. Do not infer behavior solely from commit messages.

If the working tree has uncommitted changes, state that the review covers committed branch changes only unless the user explicitly asks to include uncommitted work.

## Evaluate documentation impact

Check whether the branch changes any documented or documentable user/developer-facing behavior, including:

- CLI commands, options, defaults, accepted values, validation, output, and error behavior
- public APIs, configuration, environment variables, installation, requirements, and platform support
- workflows, permissions, migrations, and compatibility expectations

Classify findings as:

- **Required:** existing documentation is now factually wrong, or omission would prevent correct use of a changed public behavior.
- **Recommended:** documentation would materially improve discoverability or clarity, but remains technically accurate without it.
- **No update needed:** changes are internal-only or existing docs remain accurate.

Do not recommend documenting internal refactors, dependency substitutions, implementation details, or behavior that is not established by the final code.

## Confirmation gate

When documentation updates are required or recommended:

1. Identify the exact documentation file(s), section(s), and factual changes needed.
2. Present a concise proposed edit plan, separated into Required and Recommended items.
3. Ask the user for explicit approval before editing any documentation.
4. Do not edit, create, or delete documentation unless the user explicitly approves the proposed plan. If the user approves only some items, change only those items.
5. After approval, make the agreed edits and state which files were updated.

When no update is needed, state that no documentation changes are needed and briefly explain why. Do not ask for approval.

## Output format before approval

Return a concise Markdown review in this form:

```md
## Documentation review

<Scope note only if uncommitted changes were excluded.>

### Required

- `<file>` — <section and factual update needed.>

### Recommended

- `<file>` — <section and improvement.>

### Proposed edits

- <Specific edit to make.>

Would you like me to make these documentation changes?
```

Rules:

- Include only non-empty Required and Recommended sections.
- If neither section has findings, omit Proposed edits and the approval question.
- Make proposed edits specific enough for the user to approve or reject individually.
- Do not claim documentation was updated until edits have been made after approval.
