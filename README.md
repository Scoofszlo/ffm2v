# ffm2v <!-- omit from toc -->

ffm2v is my personalized CLI tool that uses FFmpeg for video processing tasks such as encoding, merging, or frame interpolation of videos. It is built using TypeScript and Node.js, and is designed to be used easily for my needs.

- [Why ffm2v?](#why-ffm2v)
- [Installation](#installation)
  - [Requirements](#requirements)
  - [Steps](#steps)
- [Usage](#usage)
  - [Encoding a video](#encoding-a-video)
    - [Examples](#examples)
  - [Setting encode quality using CRF](#setting-encode-quality-using-crf)
  - [Setting the resolution](#setting-the-resolution)
    - [Some notes to remember](#some-notes-to-remember)
  - [Stabilizing a video](#stabilizing-a-video)
    - [Some notes to remember:](#some-notes-to-remember-1)
  - [Interpolating a video](#interpolating-a-video)
    - [`minterpolate`](#minterpolate)
    - [`video2x`](#video2x)
    - [Examples](#examples-1)
  - [Merging videos](#merging-videos)
- [Updating FFmpeg](#updating-ffmpeg)
- [FAQs](#faqs)
  - [Why is H.265 the default codec?](#why-is-h265-the-default-codec)
  - [Will you support more params and complex filterchains for encoding?](#will-you-support-more-params-and-complex-filterchains-for-encoding)
  - [Is audio re-encoded?](#is-audio-re-encoded)
  - [Why merging doesn't result in lossless format?](#why-merging-doesnt-result-in-lossless-format)
- [Project versioning policy](#project-versioning-policy)
- [AI Disclosure Statement](#ai-disclosure-statement)
  - [AI/LLM Usage Rules](#aillm-usage-rules)
- [License](#license)
- [Contact](#contact)


## Why ffm2v?

This is really just a personal project and is not meant to be a replacement of FFmpeg or any other tools you know for video processing. I created ffm2v to simplify my video processing workflow just with simple commands and to have a tool that I can easily customize and extend as needed.

Initially, it is not meant to be a full-featured tool, but with the integration of frame interpolation, this project may not be just a simple FFmpeg wrapper anymore as more features might be added especially if it's related to frame interpolation.


## Installation

### Requirements

- Node.js (version 20.20 or higher)
- npm (comes with Node.js)
- FFmpeg (preferably the full master build from [Gyan Doshi](https://www.gyan.dev/ffmpeg/builds/)).

### Steps

1. Install Node.js.
2. Install FFmpeg and make sure it is added to your system's PATH.
3. Install `ffm2v` globally using npm:

   ```bash
   npm install -g ffm2v
   ```

4. Verify if it is installed correctly:

   ```bash
   ffm2v --version
   ```

## Usage

### Encoding a video

To encode a video, use the following command:

```bash
ffm2v encode -i <file> [options]
```

where `<file>` is the path of your chosen video. By default, the exported video will be created in the same directory as the input file, with `-encoded` appended to the base name.

By default, the video will be encoded using the H.265 codec with a CRF of 23, which provides a good balance between quality and file size.

You can customize the encoding options using the available flags:

- `-o, --output <dir>`: Specify the output directory. If provided folder does not exist, an error will pop up.
- `--vc, --video-codec <codec>`: Specify the video codec to use: `h264`, `h265`, or `av1` (default: `h265`). Each codec maps to its FFmpeg encoder (`libx264`, `libx265`, or `libsvtav1`), which must be available in your FFmpeg build.
- `--crf <number>`: Set the encoding quality using Constant Rate Factor (CRF) (lower is better, default: 23). See [Setting encode quality using CRF](#setting-encode-quality-using-crf) for more information.
- `--resolution <width:height>`: Set the video output resolution (e.g., `1920:1080`, `-2:1080`, `1920:-2`). See [Setting the resolution](#setting-the-resolution) for more information.
- `--stabilize <strength>`: Stabilize shaky footage, with `<strength>` from 1 (weakest) to 5 (strongest). See [Stabilizing a video](#stabilizing-a-video) for more information.
- `--interpolation-mode <mode>`: Enable frame interpolation using `minterpolate` or `video2x`. See [Interpolating a video](#interpolating-a-video) for the mode-specific options and requirements.
- `--disable-audio`: Disable audio in the output video.
- `--ffmpeg-path <path>`: Use a specific FFmpeg executable instead of the one found on your PATH. The command fails with an error if the path cannot be resolved.
- `--keep-rotation-metadata`: Keep the input video's rotation metadata instead of baking the rotation into the pixels (default: false). Has no effect if the video has no rotation metadata. With this flag, players that respect rotation metadata will display the video upright, while players that ignore it will show it sideways, and `--resolution` will refer to the stored frame rather than the displayed frame (e.g. `--resolution -2:1080` on a 90°-rotated video produces a 1440x1080 stored frame that displays as 1080x1440).

#### Examples

To encode a video with CRF value of 14 and a resolution of 1280x720, you can use the following command:

```bash
ffm2v encode -i input.mp4 --crf 14 --resolution 1280:720
```

To encode a video with AV1 instead of the default H.265:

```bash
ffm2v encode -i input.mp4 --vc av1 --crf 30
```

To encode a video while maintaining the aspect ratio, setting the height to 720 pixels, and outputs to your Downloads folder, you can use:

```bash
ffm2v encode -i input.mp4 --resolution -2:720 --output "C:\Users\User\Downloads"
```

### Setting encode quality using CRF

CRF (Constant Rate Factor) controls the quality of the encoded video. Use `--crf <number>` on `encode` or `merge`:

```bash
ffm2v encode -i input.mp4 --crf 18
```

The default is `23`. A lower number means higher quality and a larger file. A higher number means lower quality and a smaller file.

The valid range depends on the video codec used:

| Codec | `--vc` value | CRF range | Default |
| --- | --- | --- | --- |
| H.265 (default) | `h265` | 0 to 51 | 23 |
| H.264 | `h264` | 0 to 51 | 23 |
| AV1 | `av1` | 1 to 63 | 23 |

A value outside the range stops the command with an error.

> [!NOTE]
> CRF is a **QUALITY TARGET** not a **FILE SIZE TARGET**. The output size depends on how much detail and motion the video contains, so two videos encoded with the same CRF can end up very different in size.

> [!NOTE]
> The CRF scales differ between codecs. A CRF value of 23 in H.265 does not give the same quality in H.264 and AV1, so compare results within one codec.

### Setting the resolution

Use `--resolution <width:height>` on `encode` to change the video's resolution. Without it, the video keeps its original resolution.

```bash
ffm2v encode -i input.mp4 --resolution 1920:1080
```

Each side can be:

- **A pixel value**, such as `1920` or `720`. Both sides are set exactly, so the aspect ratio may change if the values don't match the original.
- **`-2`**, which calculates that side from the other one to keep the aspect ratio, rounded to an even number (required by most codecs). This is the safest choice when you only care about one dimension.
- **`-1`**, which works like `-2` but without the even-number rounding.

For example:

| Goal | Command |
| --- | --- |
| 1080p (landscape) | `--resolution 1920:1080` |
| 720px tall, aspect ratio kept | `--resolution -2:720` |
| 1920px wide, aspect ratio kept | `--resolution 1920:-2` |


Values must be whole numbers greater than zero, or `-1`/`-2`. Formats like `1920x1080` are rejected; use a colon.


ffm2v does not stop you from setting a size larger than the source (called as upscaling). However, upscaling makes the file bigger without adding real detail and doesn't really have any benefits, so pick a size no larger than the original resolution to avoid wasting file size.

#### Some notes to remember

- **Interpolation:** With `--interpolation-mode minterpolate`, scaling happens after interpolation. With `--interpolation-mode video2x`, scaling happens before interpolation, so `video2x` works on the already-scaled frames.
- **Rotated videos:** If you use `--keep-rotation-metadata` together with `--resolution`, the resolution refers to the stored frame instead of the displayed frame. For example, `--resolution -2:1080` on a 90°-rotated 3840x2160 video produces a 1920x1080 stored frame that displays as 1080x1920. Otherwise, the rotation is baked into the pixels before scaling, so `--resolution` refers to the displayed frame. With the same example, `--resolution -2:1080` produces a 608x1080 video that displays upright at that size.
- **Merging:** `merge` has no `--resolution` option. Every input is scaled to the largest resolution among the inputs.

### Stabilizing a video

Use `--stabilize <strength>` on `encode` or `merge` to reduce camera shake. The strength goes from `1` (weakest) to `5` (strongest):

```bash
ffm2v encode -i shaky.mp4 --stabilize 3
```
Choosing a strength:

- Use a low value (`1` or `2`) for slight wobble, such as handheld walking shots.
- Use a higher value (`4` or `5`) for heavy shake, such as footage from a moving vehicle.
- Start around `3` and adjust from there. Higher values smooth more motion, but they also rely more on the correction, so they may introduce more artifacts.

Stabilization works in two passes:

1. **Analysis:** FFmpeg's `vidstabdetect` filter studies the camera motion in the video and writes it to a `transforms.trf` file.
2. **Correction:** `vidstabtransform` uses that file to shift each frame back into place, then an `unsharp` filter sharpens the result to offset the softening that correction causes.

Because of this, encode may take longer than a normal encode.

#### Some notes to remember:

- On `encode`, stabilization runs before `--resolution` scaling and before any `minterpolate` interpolation.
- On `merge`, each input video is stabilized separately before the videos are joined.

### Interpolating a video

Frame interpolation means the process of adding new frames between existing ones to create smoother motion. This feature is available on both `encode` and `merge` with either `minterpolate` or `video2x` as the interpolation modes. Interpolating can increase processing time, (especially for `minterpolate`), so expect longer runs and larger files.

The mode is selected with `--interpolation-mode <mode>`, and each mode has its own required flag.

#### `minterpolate`

- `--target-fps <fps>`: The frame rate to interpolate to. Required when using this mode.
- Uses FFmpeg's motion-compensated `minterpolate` filter with a fixed "balanced" preset, so its quality/speed cannot be tuned.
- On `encode`, it runs after `--stabilize` and before any `--resolution` scaling.
- On `merge`, it applies to every input video and the merged output uses that frame rate. Both `--interpolation-mode minterpolate` and `--target-fps` must be set for it to take effect.

#### `video2x`

- Requires the `video2x` executable on your PATH, or `--video2x-path <path>` to use a specific executable.
- `--fps-multiplier <number>`: Multiply the input video's frame rate by this factor. Required when using this mode.
- `--vulkan-device-id <number>`: The Vulkan device ID for `video2x` to use. Run `video2x -l` to list the available IDs. Setting this is recommended so that the appropriate GPU is selected. Optional.
- `--keep-rotation-metadata` is not supported with this mode on `encode` and is rejected with an error, because `video2x` does not carry rotation metadata to its output.
- `--vc` and `--crf` select the codec and quality `video2x` encodes with: `--vc` maps to `-c <encoder>` (e.g. `-c libx265`) and `--crf` maps to `-e crf=<number>`.

> [!TIP]
> `video2x` is usually the better interpolation mode as it runs on the GPU, which makes it significantly faster and produces fewer artifacts. Use `minterpolate` instead if you don't have a Vulkan-capable GPU.

> [!NOTE]
> `video2x` interpolation runs as a pipeline: FFmpeg first applies the regular filters (`--stabilize`, `--resolution`, and the audio options), writes the result as a lossless FFV1 stream, and pipes it straight into `video2x`, which interpolates the frames using its RIFE processor and encodes the output with `--vc` and `--crf`. The extra lossless pass costs processing time and CPU, but it means the other options behave the same as in the regular encode flow. Because `--resolution` is applied in the pre-stage, `video2x` interpolates the already-scaled frames, unlike `minterpolate`, which scales after interpolating.

On `merge`, the pre-stage first joins the videos (and any stabilization) into a single stream, so the merged output is interpolated as one continuous video rather than per input.

#### Examples

```bash
# Interpolate to 60 FPS with FFmpeg's minterpolate filter
ffm2v encode -i input.mp4 --interpolation-mode minterpolate --target-fps 60

# Double the frame rate with video2x on Vulkan device 0
ffm2v encode -i input.mp4 --interpolation-mode video2x --fps-multiplier 2 --vulkan-device-id 0

# Interpolate every merged input to 60 FPS
ffm2v merge -i first.mp4 second.mp4 --interpolation-mode minterpolate --target-fps 60

# Interpolate the merged video with video2x
ffm2v merge -i first.mp4 second.mp4 --interpolation-mode video2x --fps-multiplier 2
```

### Merging videos

To merge multiple videos, use the following command:

```bash
ffm2v merge -i <file...> [options]
```

where `<file...>` is a space-separated list of video files to merge. The output file will be created in the same directory as the first input file, with `-merged` appended to the base name.

> [!IMPORTANT]  
> This operation does not merge videos losslessly. The videos will be re-encoded to match the highest resolution and frame rate among the input videos. This means videos that are lower than the highest resolution and frame rate will be rescaled and have their frame rates increased. When `--interpolation-mode minterpolate` and `--target-fps <fps>` are used, the output frame rate is that value instead of the highest input frame rate. When `--interpolation-mode video2x` is used, the output frame rate is the highest input frame rate multiplied by `--fps-multiplier`.

The `--stabilize <strength>` option (1 to 5) is also supported. Each input video is stabilized before merging, using the same analysis pass as `encode`, but with temporary files named `transforms-<index>.trf` in a unique `ffm2v-` directory under the OS temp path. These files are removed when the command exits.

Interpolation uses `--interpolation-mode` with `minterpolate` or `video2x`. With `minterpolate`, both `--interpolation-mode minterpolate` and `--target-fps <fps>` must be set for it to take effect; with `video2x`, `--fps-multiplier <number>` is required. See [Interpolating a video](#interpolating-a-video) for details. The `--vc`, `--crf`, `--stabilize`, `--disable-audio`, and `--ffmpeg-path <path>` options are also supported, as in `encode`.

## Updating FFmpeg

This command updates the locally installed ffmpeg to the latest version available. It only works if you are using the full master build of [Gyan Doshi](https://www.gyan.dev/ffmpeg/builds/) and if you are on Windows. It also requires `7z` and `curl` to be available on your PATH. If you attempt to use this command without using this build, it will result in an error.

To update locally installed ffmpeg, you can use the following command:

```bash
ffm2v update-ffmpeg
```

To check only update without actually performing it, you can use:

```bash
ffm2v update-ffmpeg --check-only
# or
ffm2v update-ffmpeg -c
```

When updating and you want to disable archiving of old installed ffmpeg, use the `--disable-archive` flag:

```bash
ffm2v update-ffmpeg --disable-archive
```

> [!IMPORTANT]
> I highly suggest to not use this update command as this is tweaked for my own use and might not work well for your ffmpeg setup.

> [!WARNING]  
> This operation will touch your ffmpeg installation directory and by default, the old version will be archived properly but might fail if error occurs midway. Make sure to backup your ffmpeg installation if you have custom configurations or builds that you have there before performing the update.

## FAQs

### Why is H.265 the default codec?

H.265 is my preferred video codec as it provides better file size while maintaining good video quality compared to H.264. You can achieve same quality between the two codecs but H.265 will typically have a smaller file size that's why. H.264 and AV1 are also selectable with `--vc`, but H.265 stays the default since it is what I use most of the time.

### Will you support more params and complex filterchains for encoding?

It is possible in the future but for now, it is not a priority as my use cases just revolves around simple encoding and not complicated workflows. I will add more options if I find myself needing it in the future.

### Is audio re-encoded?

When using `encode` command, it doesn't re-encode audio and is keep as is to preserve the original audio quality. However, the `merge` command re-encodes the audio to MP3 320kbps to ensure that audio works properly across all merged videos.

### Why merging doesn't result in lossless format?

I have tried using `concat` filter for merging videos losslessly and they only worked strictly if videos have similar codecs and same codec parameters. But in most use cases, it just doesn't work so I just use a filterchain based on [this documentation](https://trac.ffmpeg.org/wiki/Concatenate#filter) to merge videos and it works for all videos but with some very slight quality loss due to re-encoding.

## Project versioning policy

ffm2v uses a custom project versioning policy. Minor version is bumped for every new feature added, while patch version is bumped for bug fixes and minor changes.

Please take note that every new minor version may or may not introduce breaking changes, so be sure to check the changelog for details. This is the reason why major version is fixed to `0` for now.

## AI Disclosure Statement

This section is to disclose the usage of AI/LLM in the development of this project for transaparency and to ensure that users are aware of the extent of LLM involvement in the project.

The project source's code is not vibe coded as I don't enjoy writing program that is completely written by LLM. My LLM usage was more on line auto-completion, code architecturing ideas, feature planning, explaining bugs, among other things.

For documentation, README.md was initially written by me and with some grammatical improvements by LLM. But now, LLM is used for reviewing changes and writing, with me reviewing it to make necessary edits to ensure accuracy.

### AI/LLM Usage Rules

- **Writing of source code**
  - No function, class, or module in the source code (`./src` directory) should be written 100% by an LLM. Each one should be designed, written, and reviewed by a human.
  - LLM may generate individual lines within a function, class, or module, as long as most of that unit is written by a human and is reviewed carefully.
  - Other acceptable uses of LLM are line auto-completion and TSDoc generation.
- **Documentation**: LLM should be used to identify changes needed after implementing new features, feature changes, and/or bug fixes. LLM should also be used to write the documentation but requires human intervention to ensure accuracy.
- **Testing**: LLM may generate most automated test code, but each test shoud be carefully reviewed against the intended behavior and verified by running the relevant test suite before it is accepted.

## License

ffm2v is an open-source program licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contact

For questions or concerns, feel free to contact me via the following!:

- [Gmail](mailto:scoofszlo@gmail.com) - scoofszlo@gmail.com
- Discord - @scoofszlo
- [Reddit](https://www.reddit.com/user/Scoofszlo/) - u/Scoofszlo
- [X](https://x.com/Scoofszlo) - @Scoofszlo
