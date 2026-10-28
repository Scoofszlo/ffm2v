# Example release body

The published `v0.1.2` release body, reproduced verbatim. Use it to match voice,
capitalization, bullet shape, and PR-reference style.

```markdown
### New
- Add audio support when merging videos (#3)

### Bug fixes
- **Fix output issues for subdirectories from input source** (#4)
  The issue is that when you encode where your input folder has subdirectories on it and you have custom output, the structure of the input source will not be the same as the output folder contents.
- Fix error due to accidental audio checking on non-video files (#4)


### Changes
- Update `package.json` with repo details (#2)
- Use .mp4 as a file extension instead of .mkv for merged videos (#4)
- Rename functions/classes/variables/modules (#4):
  - Rename `MediaFile` as `FileEntry`
  - Rename `getVideoFiles` functions to `getFiles`
  - Rename variable as `file` instead of `video` 
  - Rename from `getSource()` to `getInputSource()`
  - Rename type from `Source` to `InputSource`
- Throw an error if one of the inputs is not a video when using `merge`  (#4)
- Print errors properly when using `encode` (#4)
- Remove `collectFiles` helper function and make it as an inline function to `getFiles()` of `encode` workflow (#4)

**Full Changelog**: https://github.com/Scoofszlo/ffm2v/compare/v0.1.1...v0.1.2
```

## What to take from it

- `### New`, `### Bug fixes`, `### Changes`: these exact headings, in this order.
- Empty sections are dropped — `v0.1.1` contains only `### Bug fixes`.
- The one bold bullet is the only change that needed a second line; everything else
  stays a single line.
- Sub-bullets appear only for the grouped rename batch.
- PR references sit at the end of the bullet in parentheses, and a group of changes
  from the same PR repeats that number on each bullet.
- The `**Full Changelog**` compare link closes the body.

## What this skill adds on top of it

The examples above predate the current body format: newer releases open with a
`## Release Notes` heading, a `Released on <YYYY-MM-DD> (UTC time)` line, and one or
more prose paragraphs before `### New`.
