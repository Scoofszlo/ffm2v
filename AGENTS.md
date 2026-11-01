# AGENTS.md

Guidance for agents and contributors working in this repository.

## What this project is

`ffm2v` is a personal, published CLI tool that wraps FFmpeg/FFprobe for two video
workflows (**encode** to H.265, **merge** multiple videos) plus a Windows-only
**update-ffmpeg** self-updater. It is a single-package repo (`src/` + `tests/`),
not a monorepo, and intentionally small in scope: simple workflows only, no
plugin architecture, no elaborate option surface. Prefer the smallest change
that fits `src/` as it exists.

## Commands

Use npm (a `package-lock.json` exists; do not switch package managers).

| Command                     | Purpose                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------ |
| `npm run check`             | **Full gate**: `lint && type && test && build`. Run before finishing.                |
| `npm run lint` / `lint:fix` | ESLint + Prettier (via `eslint-plugin-prettier`).                                    |
| `npm run type`              | `tsc` with `noEmit` (note the script is named `type`, not `typecheck`).              |
| `npm test` / `test:watch`   | Vitest run / watch.                                                                  |
| `npm run build`             | `tsdown` → `dist/index.mjs` with a `#!/usr/bin/env node` banner.                     |
| `npm run dev`               | `tsx src/index.ts` — run the CLI from source, e.g. `npm run dev -- encode -i x.mp4`. |

`dist/` is generated output and gitignored — never edit it by hand.

## Architecture

```
src/index.ts                  entry: create tmp dir -> check ffmpeg -> parse args -> validate
                              -> dispatch to one task
src/cli/argsParser.ts         ArgsParser class: commander program, program-level -h/-v
                              options, command wiring
src/cli/commands/             per-command option lists attached via helpGroup():
                              common.ts (shared general/encoding option factories),
                              encode.ts, merge.ts, updateFFmpeg.ts
src/cli/printer.ts            print() (success/error/warning) and spinnerPrint()
src/constants.ts              APP_VERSION, VIDEO_EXTENSIONS, ffmpeg download URLs
src/util.ts                   createTmpDir(): unique "ffm2v-" dir under the OS temp path
src/types.ts                  General types belong here: Resolution, etc.
src/filtering/filterchain/    FilterchainHandler: filter list + in/out labels
src/filtering/filtergraph/    FiltergraphHandler: joins filterchains with ";"
src/filtering/filters/        pure filter-string builders: scale.ts, unsharp.ts,
                              stabilization.ts, and interpolation/ (model.ts,
                              presets.ts, generator.ts), plus
                              escapeFilterPath() in util.ts
src/probe/                    ffprobe reads (index.ts: runFFprobe(), resolution,
                              fps, audio, duration) + pure parsers/math
                              (parsers.ts)
src/workflow/util.ts          process + fs layer: runCommand(),
                              createMediaFile(), hasVideoExtension(),
                              resolveProgramExecutable(), checkDeps(), moveFile()
src/workflow/stabilization.ts vidstabdetect pass shared by encode and merge:
                              generateStabilizationData()
src/workflow/model/           WorkflowSchema (zod), MediaFile, FFmpegArgs
                              (ffmpegArgs.ts: options -> ffmpeg CLI flag arrays),
                              Video2xArgs (video2xArgs.ts: options -> video2x
                              CLI flag arrays)
src/workflow/tasks/<task>/    index.ts orchestrator + util.ts; merge/ also has
                              filters.ts (encode/ has types.ts)
```

Flow is strictly one-way: **CLI → zod → typed workflow → task → ffmpeg**.

- `index.ts` creates the temp dir before parsing, checks that `ffmpeg` is on PATH
  via `checkDeps()`, passes the parsed options into `WorkflowSchema.parse()`
  (`tmpDir` is a required schema field), and removes the dir in a `finally` block.
  Tasks receive it as `workflow.tmpDir` for stabilization files.
- `index.ts` also runs the per-command dependency checks: `checkDeps(["ffmpeg"])`
  for every command and `checkDeps(["7z"])` for `update`. `encode` resolves and
  checks for `video2x` inside the task, in the video2x interpolation branch: the
  PATH check is skipped when `--video2x-path` is supplied, and the custom path is
  validated by `resolveProgramExecutable()` instead.

- `argsParser.ts` does **no** validation. It returns raw commander options plus a
  command name, which `index.ts` feeds into `WorkflowSchema.parse()`.
- Each task is entered through `run<Task>(workflow)` in `tasks/<task>/index.ts` and
  is the only place allowed to orchestrate (`print` progress, call utils, invoke
  ffmpeg). Reusable logic belongs in that task's `util.ts`.

## Conventions

- **TypeScript, ESM, Node >= 20.20.** `"type": "module"`.
- **Relative imports must include the `.ts` extension** (`allowImportingTsExtensions`,
  e.g. `import { print } from "../../../cli/printer.ts"`). The `@/` alias maps to
  `src/` and is wired in both `tsconfig.json` and `vitest.config.ts`; cross-tree
  imports use `@/...`, sibling imports use `./...`.
- `verbatimModuleSyntax` is on: **use `import type`** for type-only imports.
- Strict flags that bite: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `noUnusedLocals`, `noUnusedParameters`, `noPropertyAccessFromIndexSignature`,
  `noFallthroughCasesInSwitch`. Expect to handle `undefined` from indexing and to
  omit rather than `undefined`-assign optional properties.
- No default exports. Named exports, often collected at the bottom of the file
  (`export { runEncode };`). Classes for stateful things, functions elsewhere.
- Keep `noPropertyAccessFromIndexSignature` in mind when reading parsed JSON
  (`data["streams"]`, not `data.streams`).
- **Documentation comments.** Functions in `src/` have TSDoc (`/** ... */`) with a
  summary, plus `@param`, `@returns`, and `@throws` where applicable.
  - Wrap TSDoc lines at Prettier's `printWidth` (80 unless `.prettierrc` sets
    otherwise). Count the indentation and the leading `*` toward the limit.
    Prettier does not wrap comment text, and ESLint will not flag long lines.
  - When you change a function's parameters, return value, side effects, or thrown
    errors, update its TSDoc in the same change. Check that `@param` names match and
    that `@throws` still describes the actual failure conditions.
  - When you rename or remove a function, search for `{@link Name}` references and
    comments that mention it.

## Validation and errors

- **All option validation, coercion, and defaults live in the zod schemas in
  `src/workflow/model/workflow.ts`.** Adding a flag means: define it in the
  matching module under `src/cli/commands/` and attach it with `helpGroup` so it
  lands in the right help section, then extend the matching zod schema so
  defaults and types appear downstream.
- Error messages are user-facing prose; custom messages in zod are expected
  (e.g. `"CRF must be between 0 and 51"`).
- `index.ts` deliberately prints only `error.issues[0].message` to avoid dumping a
  wall of zod issues. Preserve that behavior.
- Tasks throw on failure; `src/index.ts` catches the error, reports it via
  `print(..., "error")` (using `error.issues[0].message` for zod errors), then
  calls `process.exit(1)`. The `update` task also wraps individual steps in
  `try/catch` to add context.
- All user-facing output goes through `print()` from `src/cli/printer.ts` with a
  `"success" | "error" | "warning"` type; use `chalk` for styling and
  `spinnerPrint()` for long blocking operations. Do not use bare `console.log`
  in new code (the existing `console.error` call in `tasks/update/index.ts`
  predates this convention).

## External processes

- Invoke binaries with `spawnSync`/`execSync` and **argument arrays**, not
  interpolated shell strings, so file paths with spaces or quotes stay safe.
  Requirements: `ffmpeg` (checked at startup for every command), `ffprobe`,
  `video2x` only for `--interpolation-mode video2x`, and for `update-ffmpeg`
  additionally `7z` (checked before the task runs) and `curl` (`which` is used to
  probe).
- Use the existing runners rather than writing new spawn blocks: `runCommand()`
  for ffmpeg/curl calls and `runFFprobe()` for any ffprobe call, exported from
  `src/workflow/util.ts` and `src/probe/index.ts` respectively. Both check
  `result.error` (missing binary → `ENOENT`) **before** `result.status !== 0`,
  so users get a real message instead of `stderr: undefined`. The one existing
  exception is `extractAndMove()` in `tasks/update/util.ts`, which spawns `7z`
  directly.
- Prefer `spawnSync` over `execSync`: no shell parsing, no quoting bugs, and
  `execSync` throws on non-zero exit without exposing `result.error`.
- Never assume FFmpeg/probe availability in tests — see below.

## Testing

- Vitest, files under `tests/` mirroring `src/` (`tests/cli/argsParser.test.ts`,
  `tests/workflow/model/workflow.test.ts`). Follow the mirrored path when adding.
- Existing tests cover only the **pure** layers: commander option parsing and
  `WorkflowSchema` validation/transforms. Keep it that way — do not shell out to
  ffmpeg, touch the network, or write fixtures that require real media unless the
  user explicitly asks for that infrastructure.
- Prefer driving coverage through the schema (`WorkflowSchema.parse({...})`) for
  new options rather than testing task internals; use `it.each` for input matrices
  the way the resolution cases do.
- Tests import from `src/` via relative `../../src/...` paths with the `.ts`
  extension.

## CI and release

- `.github/workflows/ci.yml` composes four reusable workflows
  (`check_lint`, `check_type`, `test_unit`, `test_build`) that run as parallel
  jobs on Node 20 with `npm ci`.
- CI is skipped for documentation/metadata-only changes via `paths-ignore`
  (`**/*.md`, `.agents/**`, `.codegraph/**`, `LICENSE`, `.gitignore`,
  `.gitattributes`, `.github/FUNDING.yml`) on both `push` and `pull_request`.
  The list is an ignore list on purpose: anything not listed still triggers CI.
  Keep the two `paths-ignore` blocks in sync when editing it.
- `publish_to_npm.yml` publishes on `v*.*.*` tags using Node 24 and chooses the
  npm dist-tag automatically: any prerelease version (`0.1.0-beta.1`) → `beta`,
  otherwise `latest`.
- Version bumps are made with `npm version`, which uses the `.npmrc`
  `message="Bump version to v%s"` template and creates the tag that triggers
  publishing. Don't hand-edit the version in `package.json` and the lockfile
  separately.
- `APP_VERSION` is derived from `package.json` via a JSON import — there is no
  second place to update the version.
- Commit and PR titles in this repo are short, imperative, sentence-case
  (`Add tests (#9)`, `Fix lint issue`). Match that style.

## Scope discipline

- This tool targets FFmpeg's `libx265` and the Gyan Doshi Windows build. Don't add
  codec abstraction, cross-platform updater support, or new commands unless asked.
  `video2x` is the one deliberate exception: an optional, encode-only external
  tool for frame interpolation. It does not relax the codec or platform
  constraints above.
- Keep FFmpeg work on the CLI boundary. Pure helpers and utilities are cheap to
  test and belong next to their concern: filter-string builders in
  `src/filtering/filters/`, chain/graph assemblers in
  `src/filtering/filterchain/` and `src/filtering/filtergraph/`, probe reads in
  `src/probe/index.ts` with parsers/ratio math in `src/probe/parsers.ts`, and
  process/fs utilities in `src/workflow/util.ts`. Anything that reads a media
  file goes through `src/probe/`, called from `createMediaFile()`/task code.
- No monorepo tooling, task runners, or caching layers are set up — don't
  introduce one (Turborepo, nx, wireit, etc.) as a side effect of a task.
