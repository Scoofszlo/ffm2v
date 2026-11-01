# ffm2v

ffm2v is my personalized CLI tool that uses ffmpeg for video processing tasks such as encoding and merging videos. It is built using TypeScript and Node.js, and is designed to be used easily for my needs.

## Why ffm2v?

This is really just a personal project and is not meant to be a replacement of ffmpeg or any other tools you know for video processing. I created ffm2v to simplify my video processing workflow just with simple commands and to have a tool that I can easily customize and extend as needed. This is not really intended to be a full-featured video processing tool. Plus, I created this project to explore the JavaScript/TypeScript ecosystem as I was more familiar with Python from my previous projects.

## Installation

### Requirements

- Node.js (version 20.20 or higher)
- npm (comes with Node.js)
- FFmpeg (preferably the full master build from [Gyan Doshi](https://www.gyan.dev/ffmpeg/builds/))

### Steps

1. Install Node.js.
2. Install `ffmpeg` and make sure it is added to your system's PATH, or pass its location with `--ffmpeg-path` option.
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
- `--vc, --video-codec <codec>`: Specify the video codec to use (default: libx265). Currently, only H.265 is supported as this is really just my preferred codec so there's no point on using this flag. I just added this for future additional codec support.
- `--crf <number>`: Set the Constant Rate Factor (CRF) for encoding quality (lower is better, default: 23). A lower CRF value will result in higher quality and larger file size, while a higher CRF value will result in lower quality and smaller file size.
- `--resolution <width:height>`: Set the output resolution (e.g., `1920:1080`, `-2:1080`, `1920:-2`). You can use `-2` to maintain the aspect ratio based on the other dimension.
- `--stabilize <strength>`: Stabilize shaky footage, with `<strength>` from 1 (weakest) to 5 (strongest). Stabilization runs an analysis pass on each video before encoding, so encoding takes longer. The analysis writes a temporary `transforms.trf` file to a unique `ffm2v-` directory under the OS temp path; the file is reused for each video and the directory is removed when the command exits.
- `--interpolation-mode <mode>`: Enable frame interpolation using `minterpolate` or `video2x`. See [Interpolating a video](#interpolating-a-video) for the mode-specific options and requirements.
- `--disable-audio`: Disable audio in the output video.
- `--ffmpeg-path <path>`: Use a specific FFmpeg executable instead of the one found on your PATH. The command fails with an error if the path cannot be resolved.
- `--keep-rotation-metadata`: Keep the input video's rotation metadata instead of baking the rotation into the pixels (default: false). Has no effect if the video has no rotation metadata. With this flag, players that respect rotation metadata will display the video upright, while players that ignore it will show it sideways, and `--resolution` will refer to the stored frame rather than the displayed frame (e.g. `--resolution -2:1080` on a 90°-rotated video produces a 1440x1080 stored frame that displays as 1080x1440).

#### Examples

To encode a video with CRF value of 14 and a resolution of 1280x720, you can use the following command:

```bash
ffm2v encode -i input.mp4 --crf 14 --resolution 1280:720
```

To encode a video while maintaining the aspect ratio, setting the height to 720 pixels, and outputs to your Downloads folder, you can use:

```bash
ffm2v encode -i input.mp4 --resolution -2:720 --output "C:\Users\User\Downloads"
```

### Interpolating a video

Frame interpolation is available on `encode` with either `minterpolate` or `video2x`, and on `merge` with `minterpolate` only. Interpolating significantly increases processing time and the number of frames in the output, so expect longer runs and larger files.

The mode is selected with `--interpolation-mode <mode>`, and each mode has its own required flag.

#### `minterpolate`

- `--target-fps <fps>`: The frame rate to interpolate to. Required when using this mode.
- Uses FFmpeg's motion-compensated `minterpolate` filter with a fixed "balanced" preset, so its quality/speed cannot be tuned.
- On `encode`, it runs after `--stabilize` and before any `--resolution` scaling.
- On `merge`, it applies to every input video and the merged output uses that frame rate. Both `--interpolation-mode minterpolate` and `--target-fps` must be set for it to take effect.

#### `video2x`

- Requires the `video2x` executable on your PATH, or `--video2x-path <path>` to use a specific executable. It is only checked when this mode is used.
- `--fps-multiplier <number>`: Multiply the input video's frame rate by this factor. Required when using this mode.
- `--vulkan-device-id <number>`: The Vulkan device ID for `video2x` to use. Run `video2x -l` to list the available IDs. Setting this is recommended so that the appropriate GPU is selected. Optional.

> [!TIP]
> It is recommended to use `video2x` as a primary interpolation mode as it significantly has better speeds as it uses GPU and way less artifacts, though it doesn't support several options such as stabilization, disabling audio, among others. Use `minterpolate` otherwise if you need those features or if you don't have GPU.

> [!IMPORTANT]
> `video2x` interpolation is a separate pipeline from the regular encode flow. It ignores `--stabilize`, `--resolution`, `--disable-audio`, and `--keep-rotation-metadata`. Only the input, output, `--fps-multiplier`, `--vc`, `--crf`, and `--vulkan-device-id` are passed to `video2x`, which interpolates the video with its RIFE processor and writes the output file itself.

#### Examples

```bash
# Interpolate to 60 FPS with FFmpeg's minterpolate filter
ffm2v encode -i input.mp4 --interpolation-mode minterpolate --target-fps 60

# Double the frame rate with video2x on Vulkan device 0
ffm2v encode -i input.mp4 --interpolation-mode video2x --fps-multiplier 2 --vulkan-device-id 0

# Interpolate every merged input to 60 FPS
ffm2v merge -i first.mp4 second.mp4 --interpolation-mode minterpolate --target-fps 60
```

### Merging videos

To merge multiple videos, use the following command:

```bash
ffm2v merge -i <file...> [options]
```

where `<file...>` is a space-separated list of video files to merge. The output file will be created in the same directory as the first input file, with `-merged` appended to the base name.

> [!IMPORTANT]  
> This operation does not merge videos losslessly. The videos will be re-encoded to match the highest resolution and frame rate among the input videos. This means videos that are lower than the highest resolution and frame rate will be rescaled and have their frame rates increased. When `--interpolation-mode minterpolate` and `--target-fps <fps>` are used, the output frame rate is that value instead of the highest input frame rate.

The `--stabilize <strength>` option (1 to 5) is also supported. Each input video is stabilized before merging, using the same analysis pass as `encode`, but with temporary files named `transforms-<index>.trf` in a unique `ffm2v-` directory under the OS temp path. These files are removed when the command exits.

Interpolation uses `--interpolation-mode minterpolate` and `--target-fps <fps>`; both flags must be set for it to take effect, and `minterpolate` is the only mode available for `merge`. See [Interpolating a video](#interpolating-a-video) for details. The `--disable-audio` and `--ffmpeg-path <path>` options are also supported, as in `encode`.

## Updating ffmpeg

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

### Why use H.265 as main and only codec?

H.265 is my preferred video codec as it provides better file size while maintaining good video quality compared to H.264. You can achieve same quality between the two codecs but H.265 will typically have a smaller file size that's why.

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
