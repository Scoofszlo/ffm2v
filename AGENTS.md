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

| Command | Purpose |
| --- | --- |
| `npm run check` | **Full gate**: `lint && type && test && build`. Run before finishing. |
| `npm run lint` / `lint:fix` | ESLint + Prettier (via `eslint-plugin-prettier`). |
| `npm run type` | `tsc` with `noEmit` (note the script is named `type`, not `typecheck`). |
| `npm test` / `test:watch` | Vitest run / watch. |
| `npm run build` | `tsdown` → `dist/index.mjs` with a `#!/usr/bin/env node` banner. |
| `npm run dev` | `tsx src/index.ts` — run the CLI from source, e.g. `npm run dev -- encode -i x.mp4`. |

`dist/` is generated output and gitignored — never edit it by hand.

## Architecture

```
src/index.ts                  entry: parse args -> validate -> dispatch to one task
src/cli/args_parser.ts        ArgsParser class: commander program + command definitions
src/cli/commands.ts           shared option definitions + applyCommonOptions()
src/cli/printer.ts            print() (success/error/warning) and spinnerPrint()
src/constants.ts              APP_VERSION, VIDEO_EXTENSIONS, ffmpeg download URLs
src/param/model.ts            FFmpegEncodingParams: options -> ffmpeg CLI flag arrays
src/workflow/helpers.ts       filesystem/ffprobe probes via createFileEntry(); runFFprobe() runner
src/workflow/model/           WorkflowSchema (zod) + FileEntry class
src/workflow/tasks/<task>/    index.ts orchestrator, helpers.ts, filtergraph.ts, types.ts
```

Flow is strictly one-way: **CLI → zod → typed workflow → task → ffmpeg**.

- `args_parser.ts` does **no** validation. It returns raw commander options plus a
  command name, which `index.ts` feeds into `WorkflowSchema.parse()`.
- Each task is entered through `run<Task>(workflow)` in `tasks/<task>/index.ts` and
  is the only place allowed to orchestrate (`print` progress, call helpers, invoke
  ffmpeg). Reusable logic belongs in that task's `helpers.ts`.

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

## Validation and errors

- **All option validation, coercion, and defaults live in the zod schemas in
  `src/workflow/model/workflow.ts`.** Adding a flag means: define it in
  `src/cli/commands.ts` (or the command in `args_parser.ts`), then extend the
  matching zod schema so defaults and types appear downstream.
- Error messages are user-facing prose; custom messages in zod are expected
  (e.g. `"CRF must be between 0 and 51"`).
- `index.ts` deliberately prints only `error.issues[0].message` to avoid dumping a
  wall of zod issues. Preserve that behavior.
- Tasks wrap their body in `try/catch`, report via `print(err, "error")`, then
  `process.exit(1)`.
- All user-facing output goes through `print()` from `src/cli/printer.ts` with a
  `"success" | "error" | "warning"` type; use `chalk` for styling and
  `spinnerPrint()` for long blocking operations. Do not use bare `console.log`
  in new code (existing `console.error` calls in `param/model.ts` and
  `tasks/update/index.ts` predate this convention).

## External processes

- Invoke binaries with `spawnSync`/`execSync` and **argument arrays**, not
  interpolated shell strings, so file paths with spaces or quotes stay safe.
  Requirement: `ffmpeg`, `ffprobe`; `update-ffmpeg` additionally needs `7z` and
  `curl` on PATH (`which` is used to probe).
- Use the existing runners rather than writing new spawn blocks: `runFFprobe()` in
  `src/workflow/helpers.ts` for any ffprobe call, and the module-local
  `runCommand()` in `tasks/update/helpers.ts` for ffmpeg/curl. Both check
  `result.error` (missing binary → `ENOENT`) **before** `result.status !== 0`, so
  users get a real message instead of `stderr: undefined`.
- Prefer `spawnSync` over `execSync`: no shell parsing, no quoting bugs, and
  `execSync` throws on non-zero exit without exposing `result.error`.
- Never assume FFmpeg/probe availability in tests — see below.

## Testing

- Vitest, files under `tests/` mirroring `src/` (`tests/cli/args_parser.test.ts`,
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
- Keep FFmpeg work on the CLI boundary. Pure helpers (string/array/ratio math)
  are cheap to test and belong in `helpers.ts`; anything that reads a media file
  belongs behind `createFileEntry()`/task code.
- No monorepo tooling, task runners, or caching layers are set up — don't
  introduce one (Turborepo, nx, wireit, etc.) as a side effect of a task.
