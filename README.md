# ffm2v

ffm2v is my personalized CLI tool that uses ffmpeg for video processing tasks such as encoding and merging videos. It is built using TypeScript and Node.js, and is designed to be used easily for my needs.

## Why ffm2v?

This is really just a personal project and is not meant to be a replacement of ffmpeg or any other tools you know for video processing. I created ffm2v to simplify my video processing workflow just with simple commands and to have a tool that I can easily customize and extend as needed. This is not really intended to be a full-featured video processing tool. Plus, I created this project to explore the JavaScript/TypeScript ecosystem as I was more familiar with Python from my previous projects.

## Installation

### Requirements

- Node.js (version 20 or higher)
- npm (comes with Node.js)

### Steps

1. Install Node.js.
2. Install `ffmpeg` and make sure it is added to your system's PATH.
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

By default, the video will be encoded using the H.265 codec with a CRF of 18, which provides a good balance between quality and file size. This value is a bit lower than what typical users would use (like around 23).

You can customize the encoding options using the available flags:

- `-o, --output <dir>`: Specify the output directory. If provided folder does not exist, an error will pop up.
- `--vc, --video-codec <codec>`: Specify the video codec to use  (default: libx265). Currently, only H.265 is supported as this is really just my preferred codec so there's no point on using this flag. I just added this for future additional codec support.
- `--crf <number>`: Set the Constant Rate Factor (CRF) for encoding quality (lower is better, default: 18). A lower CRF value will result in higher quality and larger file size, while a higher CRF value will result in lower quality and smaller file size.
- `--resolution <width:height>`: Set the output resolution (e.g., `1920:1080`, `-2:1080`, `1920:-2`). You can use `-2` to maintain the aspect ratio based on the other dimension.
- `--disable-audio`: Disable audio in the output video.
- `--allow-auto-rotate`: Automatically rotate the video based on its rotation metadata (default: false). This value has no effect if video has no rotation metadata.

#### Examples

To encode a video with CRF value of 14 and a resolution of 1280x720, you can use the following command:

```bash
ffm2v encode -i input.mp4 --crf 14 --resolution 1280:720
```

To encode a video while maintaining the aspect ratio, setting the height to 720 pixels, and outputs to your Downloads folder, you can use:

```bash
ffm2v encode -i input.mp4 --resolution -2:720 --output "C:\Users\User\Downloads"
```

### Merging videos

To merge multiple videos, use the following command:

```bash
ffm2v merge -i <file...> [options]
```

where `<file...>` is a space-separated list of video files to merge. The output file will be created in the same directory as the first input file, with `-merged` appended to the base name.

> [!IMPORTANT]  
> This operation does not merge videos losslessly. The videos will be re-encoded to match the highest resolution and frame rate among the input videos. This means videos that are lower than the highest resolution and frame rate will be rescaled and have their frame rates increased.

## Updating ffmpeg

This command updates the locally installed ffmpeg to the latest version available. It only works if you are using the full master build of [Gyan Doshi](https://www.gyan.dev/ffmpeg/builds/) and if you are on Windows. If you attempt to use this command without using this build, it will result in an error.

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
> This operation will touch your ffmpeg installation directory and by default, the old version will be archived properly but might fail if error occurs midway. Make sure to backup your ffmpeg installation if you have custom configurations or builds that you have there  before performing the update.

## FAQs

### Why use H.265 as main and only codec?

H.265 is my preferred video codec as it provides better file size while maintaining good video quality compared to H.264. You can achieve same quality between the two codecs but H.265 will typically have a smaller file size that's why.

### Will you support more params and complex filterchains for encoding?

It is possible in the future but for now, it is not a priority as my use cases just revolves around simple encoding and not complicated workflows. I will add more options if I find myself needing it in the future.

### Is audio re-encoded?

When using `encode` command, it doesn't re-encode audio and is keep as is to preserve the original audio quality. The `merge` command currently outputs no audio as I haven't fully implemented the audio merging part yet.

### Why merging doesn't result in lossless format?

I have tried using `concat` filter for merging videos losslessly and they only worked strictly if videos have similar codecs and same codec parameters. But in most use cases, it just doesn't work so I just use a  filterchain based on [this documentation](https://trac.ffmpeg.org/wiki/Concatenate#filter) to merge videos and it works for all videos but with some very slight quality loss due to re-encoding.

## Project versioning policy

ffm2v uses a custom project versioning policy. Minor version is bumped for every new feature added, while patch version is bumped for bug fixes and minor changes.

Please take note that every new minor version may or may not introduce breaking changes, so be sure to check the changelog for details. This is the reason why major version is fixed to `0` for now.

## License

ffm2v is an open-source program licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contact

For questions or concerns, feel free to contact me via the following!:
- [Gmail](mailto:scoofszlo@gmail.com) - scoofszlo@gmail.com
- Discord - @scoofszlo
- [Reddit](https://www.reddit.com/user/Scoofszlo/) - u/Scoofszlo
- [X](https://x.com/Scoofszlo) - @Scoofszlo
