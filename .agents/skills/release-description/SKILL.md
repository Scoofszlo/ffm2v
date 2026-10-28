---
name: release-description
description: Draft a GitHub release description for the next ffm2v version from the work between the previous release tag and HEAD. Use when preparing a release, writing release notes, or publishing a GitHub release after a version bump.
disable-model-invocation: true
---

# Release description

Draft the body of a GitHub release for this repository, built from the commits and
code changes since the previous version tag. The output is the paste-ready body and
nothing else. Never publish a release, create a tag, or write files unless the user
explicitly asks.

## Ground truth

1. `git status --short --branch` — release notes describe committed, pushed work. If
   the tree is dirty or the branch is not the release branch (`main`), say so and
   confirm what to include before continuing.
2. Determine the target version: an explicit version from the user
   (e.g. `/skill:release-description v0.3.0`), otherwise `package.json` `version`,
   which `npm version` keeps in sync with the `v<version>` tag.
3. Determine the base tag: the newest `v*.*.*` tag that precedes the target.
   `git tag --sort=-v:refname` lists tags newest-first, and
   `git describe --tags --abbrev=0 <target>^` resolves the tag on the target's
   parent commit. When the target version is not tagged yet,
   `git describe --tags --match "v*.*.*" --abbrev=0` returns the current head's
   tag, which is the base.
4. `git log --oneline <base>..HEAD` for the commit list and
   `git diff --stat <base>...HEAD` for the shape of the change.
5. Pull request context — commits carry PR numbers (`(#14)`), and in this repo the
   PR body often spells out what each commit changed. Fetch the description for any
   PR whose commit subject is vague (`General code improvements (#14)`) or that
   covers several unrelated areas, once per number:
   - `gh pr view <n> --json title,body` when `gh` exists,
   - otherwise `curl -s https://api.github.com/repos/<owner>/<repo>/pulls/<n>` and
     read `title` and `body` (unauthenticated calls work for public repos within
     the hourly rate limit; a 403/404 just means skip it).
   Skip PRs whose subject already explains the change — never fetch a PR just because
   it has a number, and never bulk-fetch the range. The PR body supplies intent and
   terminology only: the diff stays authoritative, and a PR claim the code does not
   support (for example "tests pass") never enters the notes. If neither tool works,
   continue with the commits and diff; never guess what a vague commit meant.
6. Read the changed user-facing code and docs. Commit messages are hints, not
   evidence: this repo has vague titles (`General code improvements (#14)`,
   `Fix lint issue`), so every bullet must describe behavior you confirmed in the
   diff. When a change cannot be verified from the code, leave it out instead of
   guessing.
7. Classify the bump as patch, minor, or major by comparing the base tag with the
   target version. The "Project versioning policy" in `README.md` says minor bumps
   add features, patch bumps fix bugs or make minor changes, and major stays at `0`
   for now. A mismatch means the notes or the version is wrong — raise it.

Exclude from the notes: the `Bump version to v<version>` commit (it is the tag
commit), merge commits, lint/format-only commits, and anything internal with no
user-visible effect.

## Structure

```markdown
## Release Notes

Released on <YYYY-MM-DD> (UTC time)

<summary paragraph(s)>

### New

- <change> (#<pr>)

### Bug fixes

- <change> (#<pr>)

### Changes

- <change> (#<pr>)

**Full Changelog**: https://github.com/<owner>/<repo>/compare/<base>...<target>
```

### Release notes header

- Open the body with the `## Release Notes` heading, then a line reading
  `Released on <YYYY-MM-DD> (UTC time)`.
- Get the date from `date -u +%F`; never guess or reuse the tag or commit date. The
  release is dated with the day the notes are written.
- Keep both lines exactly as shown: no bold, no trailing text, no local time zone.

### Summary paragraph

- Follows the `Released on` line, with no heading of its own, and is the only prose in
  the body.
- Patch release: one short paragraph of a few sentences. Minor or major release: one
  long paragraph, or two or three when there are genuinely separate things to say.
  Stop before it becomes a wall of text — the bullets carry the detail.
- Say what kind of release this is and what matters most to a user of the CLI. Do not
  re-list the bullets, do not promise features that are not in the diff.
- If the target version is a prerelease (`0.3.0-beta.1`), state that in the summary;
  CI publishes prerelease versions under the `beta` npm dist-tag. If a change breaks
  existing usage, state it here as well and bold that bullet.
- Plain prose only: no bullets, headings, emoji, or `we`/`I`.

### Sections

- Use exactly these headings, in this order: `### New`, `### Bug fixes`, `### Changes`.
- Include a heading only when it has at least one bullet; delete empty sections
  entirely rather than leaving an empty heading.
- **New** — capabilities that did not exist before: commands, flags, supported inputs.
- **Bug fixes** — user-visible wrong behavior that is now correct.
- **Changes** — behavior or interface changes, renames, option semantics, dependency
  or documentation changes worth knowing. Collapse pure internal refactors into one
  bullet or omit them; do not pad the section.
- Do not invent a fourth section (Breaking changes, Performance, …). Fold those into
  the summary and the existing sections unless the user asks otherwise.

### Bullets

- One line per change, `- ` prefix, verb-first (`Add`, `Fix`, `Rename`, `Remove`,
  `Use`), ending with the PR reference when one exists:
  `- Fix incomplete cleanup after updating ffmpeg through CLI (#1)`.
- PR numbers come from the commit message suffix (`(#13)`). Never invent or guess
  one — omit the reference when a commit has none.
- One commit or PR can yield several bullets. When it delivers independently
  user-visible changes — a new flag plus an unrelated fix, two separate fixes, a
  behavior change plus its error handling — give each its own bullet and repeat the
  same number on every one; `#4` carries most of the bullets in
  `references/example-release.md`. Reusing a number is expected, inventing one is not.
  Do not split a single outcome across bullets to pad the list.
- Order bullets by user impact, not by commit order.
- When one line cannot carry the change, put a short bold title on the bullet and
  explain on continuation lines indented two spaces. Bold only the title, ending it
  before the PR reference, and leave the continuation lines regular weight:

  ```markdown
  - **Fix output issues for subdirectories from input source** (#4)
    When the input is a directory with subdirectories and `--output` is set, the
    output tree did not mirror the input structure.
  ```

  Use this only where a one-liner genuinely loses information; most bullets stay a
  single line.
- Use sub-bullets only to group genuinely related items, such as a batch of renames
  (see `references/example-release.md`).
- Wrap continuation text near 80 columns; keep the bullet itself on one line.
- Use inline code for flags, commands, files, and symbol names.

### Footer

- Final line:
  `**Full Changelog**: https://github.com/<owner>/<repo>/compare/<base>...<target>`,
  derived from `git remote get-url origin`. Published releases in this repo use it.

## Output

Return only the release-body Markdown described above, ready to paste into GitHub:
no preamble, no code fences, no base-tag or bump-type summary, no list of excluded
commits, no closing questions, and no offer to save or publish. The body starts with
the `## Release Notes` header and ends with the `**Full Changelog**` line.

Two exceptions, stated in one short sentence each so the output is never misleading:

- The tree is dirty, the branch is not `main`, or the base tag cannot be resolved.
- There is nothing to release — the target tag sits on `HEAD`, or the commits do not
  match the target version's bump policy. Do not emit a body; say what is wrong and
  what has to be decided.

Never publish a release, create a tag, or write files unless the user explicitly asks.
If asked to publish, check `gh --version` first and use
`gh release create <tag> --title <tag> --notes-file <file>`. Never edit
`package.json`, create a tag, or push a tag; those belong to `npm version`.

## Style anchors

- `references/example-release.md` — a real published release body from this repo.
  Match its voice, capitalization, and reference style.

## After the release

If publishing reveals a durable improvement to this skill (a command that fails, a
convention that changed), propose the specific edit to the user and wait for approval.
Do not store one-off version numbers, draft bodies, or speculative rules here.
