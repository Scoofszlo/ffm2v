---
name: branch-test-review
description: Review the current feature branch for missing or outdated tests. Use when a feature is complete, before opening a pull request, or when asked whether branch changes need test coverage. Inspect the branch diff and commits, update tests when requested, and run the project test suite.
---

# Branch test review

Review the branch's net behavior change before deciding whether tests are needed. A commit list is supporting context only; the merge-base diff is the source of truth because commits may be rebased, squashed, or reverted.

## 1. Establish the review scope

1. Run `git status --short` and report uncommitted changes separately. Do not silently treat them as committed branch work.
2. Identify the current branch with `git branch --show-current`.
3. Use `origin/main` as the base when it exists; otherwise use `main`. If neither exists, ask the user which base branch to use.
4. Inspect:
   - `git log --oneline <base>..HEAD`
   - `git diff --stat <base>...HEAD`
   - `git diff <base>...HEAD`

If the branch has no net diff, report that and do not create tests.

## 2. Assess test impact

For every behavior-changing source change, identify its existing tests or explain why no automated test is appropriate. Consider new or modified:

- commands, options, input parsing, defaults, and error paths;
- validation rules, type coercion, transformations, and boundary values;
- workflow behavior, side effects, external-process calls, and failure handling;
- bug fixes, especially the regression condition described by the change.

Changes limited to documentation, formatting, generated files, dependency metadata, or build-only configuration do not automatically require tests.

Keep pipeline layers separate. For example, argument-parser tests should assert command syntax, aliases, defaults, and raw parsed values; schema tests should assert semantic validation, coercion, and transformations. Do not make parser tests depend on schema validation unless an end-to-end test is explicitly needed.

## 3. Choose the requested mode

- For a review-only request, report which tests should be added or updated, where they belong, and why. Do not modify files.
- For a request to prepare or finish the branch, add or update the smallest useful tests for concrete gaps. Do not add tests merely to increase count or coverage.
- If the user did not specify a mode and test gaps exist, ask whether they want the tests implemented or only a review.

Place project tests under `tests/`, mirroring the source structure. Prefer focused unit tests; add integration tests only when behavior crosses module or process boundaries that unit tests cannot cover.

## 4. Verify

Run `npm test` after test changes and after any relevant implementation changes. It runs this project's linting, type check, Vitest suite, and build. If it fails, report the exact failing stage and do not claim verification succeeded.

## 5. Report concisely

State:

- review base and whether uncommitted changes were excluded;
- behavior changes reviewed;
- tests added, updated, or intentionally not needed;
- commands run and results;
- remaining notable coverage gaps or risks.
