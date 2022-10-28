// ---------------------------------------------------------------------------------------------------------------------
// Video Manager
// ---------------------------------------------------------------------------------------------------------------------

import { join, resolve, basename } from 'node:path';

import bb from 'bluebird';
import cliProgress from 'cli-progress';
import colors from 'ansi-colors';

// Engines
import ffmpeg from '../engines/ffmpeg.js';
import mkvmerge from '../engines/mkvmerge.js';
import upscaler, { UpscaleModels } from '../engines/upscaler.js';
import files from '../engines/files.js';

// ---------------------------------------------------------------------------------------------------------------------

class VideoManager
{
    async $mergeFiles(videoPath, upscaledFile, output, debug)
    {
        const progressBar = new cliProgress.SingleBar({
            format: 'Rebuilding Video  |' + colors.cyan('{bar}') + '| {percent}%',
            barCompleteChar: '\u2588',
            barIncompleteChar: '\u2591',
            hideCursor: true
        });

        await mkvmerge.mergeVideo(videoPath, upscaledFile, output,
            (cmd) =>
            {
                if (debug)
                {
                    console.debug('mkvmerge cmd:', cmd);
                }

                progressBar.start(100, 0, {
                    percent: 0
                });
            },
            ({ percent }) =>
            {
                progressBar.update(percent, {
                    percent
                });
            }
        );

        // Ensure a final update
        progressBar.update(100, {
            percent: 100
        });

        progressBar.stop();
    }

    async $mergeFilesOld(videoPath, upscaledFile, output, totalFrames)
    {
        const progressBar = new cliProgress.SingleBar({
            format: 'Rebuilding Video  |' + colors.cyan('{bar}') + '| {percentage}% || {frames}/{totalFrames} || FPS: {fps} || Step {step} of 2',
            barCompleteChar: '\u2588',
            barIncompleteChar: '\u2591',
            hideCursor: true
        });

        await ffmpeg.replaceVideo(videoPath, upscaledFile, upscaledFile.replace('.mkv', '.mp4'),
            (cmd) =>
            {
                console.debug('ffmpeg cmd:', cmd);

                progressBar.start(totalFrames, 0, {
                    frames: 0,
                    fps: 0,
                    totalFrames,
                    step: 1
                });
            },
            (progress) =>
            {
                progressBar.update(progress.frames, {
                    frames: progress.frames,
                    fps: progress.currentFps
                });
            }
        );

        // Stop for the moment
        progressBar.stop();

        await ffmpeg.mergeSubtitles(upscaledFile.replace('.mkv', '.mp4'), videoPath, output,
            (cmd) =>
            {
                console.debug('ffmpeg cmd:', cmd);

                // Reset for Step 2
                progressBar.start(totalFrames, 0, {
                    frames: 0,
                    fps: 0,
                    totalFrames,
                    step: 2
                });
            },
            (progress) =>
            {
                progressBar.update(progress.frames, {
                    frames: progress.frames,
                    fps: progress.currentFps
                });
            }
        );

        // Ensure a final update
        progressBar.update(totalFrames, {
            frames: totalFrames
        });

        progressBar.stop();
    }

    async $importFrames(scaledFramePath, upscaledFile, fps, totalFrames, debug)
    {
        const importBar = new cliProgress.SingleBar({
            format: 'Importing Frames  |' + colors.cyan('{bar}') + '| {percentage}% || {frames}/{totalFrames} || FPS: {fps}',
            barCompleteChar: '\u2588',
            barIncompleteChar: '\u2591',
            hideCursor: true
        });

        await ffmpeg.importFrames(scaledFramePath, upscaledFile, fps,
            (cmd) =>
            {
                if (debug)
                {
                    console.debug('ffmpeg cmd:', cmd);
                }

                importBar.start(totalFrames, 0, {
                    frames: 0,
                    fps: 0,
                    totalFrames,
                });
            },
            (progress) =>
            {
                importBar.update(progress.frames, {
                    frames: progress.frames,
                    fps: progress.currentFps
                });
            }
        );

        // Ensure a final update
        importBar.update(totalFrames, {
            frames: totalFrames
        });

        importBar.stop();
    }

    async $upscaleDir(sourcePath, outPath, scale, model, progressHandler = () => {}, pretend = false, debug = false)
    {
        let count = 0;
        const frames = await files.listFiles(sourcePath, '.png');
        const startTime = new Date().getTime();
        await bb.map(frames, async (fileName) =>
        {
            const input = join(sourcePath, fileName);
            const output = join(outPath, fileName);

            if (pretend)
            {
                // We just copy the frames, instead of upscaling. Useful for debugging the rest of this.
                await files.copyFile(input, output);
            }
            else
            {
                // Upscale the frames
                await upscaler.upscale(input, output, model, scale);
            }

            count++;

            // Report Progress
            const endTime = new Date().getTime();
            progressHandler({ frames: count, fps: (count / ((endTime - startTime) / 1000)).toFixed(2) });
        }, { concurrency: 6 });
    }

    async $upscaleFrames(sourceFramePath, scaledFramePath, scale, model, pretend, totalFrames, debug)
    {
        const progressBar = new cliProgress.SingleBar({
            format: 'Upscaling Frames  |' + colors.cyan('{bar}') + '| {percentage}% || {frames}/{totalFrames} || FPS: {fps}',
            barCompleteChar: '\u2588',
            barIncompleteChar: '\u2591',
            hideCursor: true
        });

        progressBar.start(totalFrames, 0, {
            frames: 0,
            fps: 0,
            totalFrames,
        });

        await this.$upscaleDir(sourceFramePath, scaledFramePath, scale, model, ({ frames, fps }) =>
        {
            progressBar.update(frames, {
                frames,
                fps
            });
        }, pretend);

        // Ensure a final update
        progressBar.update(totalFrames, {
            frames: totalFrames
        });

        progressBar.stop();
    }

    async $extractFrames(videoPath, sourceFramePath, totalFrames, debug)
    {
        const progressBar = new cliProgress.SingleBar({
            format: 'Extracting Frames |' + colors.cyan('{bar}') + '| {percentage}% || {frames}/{totalFrames} || FPS: {fps}',
            barCompleteChar: '\u2588',
            barIncompleteChar: '\u2591',
            hideCursor: true
        });

        await ffmpeg.extractFrames(videoPath, sourceFramePath,
            (cmd) =>
            {
                if (debug)
                {
                    console.debug('ffmpeg cmd:', cmd);
                }

                progressBar.start(totalFrames, 0, {
                    frames: 0,
                    totalFrames,
                    fps: 0
                });
            },
            (progress) =>
            {
                progressBar.update(progress.frames, {
                    frames: progress.frames,
                    fps: progress.currentFps
                });
            }
        );

        // Ensure a final update
        progressBar.update(totalFrames, {
            frames: totalFrames
        });

        progressBar.stop();
    }

    async $getMetadata(videoPath)
    {
        console.log('\nGenerating Metadata...');

        const inputMetadata = await ffmpeg.getMetadata(videoPath);
        const fps = (inputMetadata.streams.filter((stream) => stream.codec_type === 'video')[0] ?? {})
            ?.r_frame_rate;
        const totalFrames = (inputMetadata.streams.filter((stream) => stream.codec_type === 'video')[0] ?? {})
            ?.nb_read_frames;

        console.log('...Metadata generated!\n');

        return { fps: fps ?? 23.97, totalFrames };
    }

    async upscaleVideo(videoPath, outPath, scale = 2, model = UpscaleModels.animeVideoV3, pretend = false, debug = false)
    {
        videoPath = resolve(videoPath);
        const fileName = basename(videoPath);

        outPath = resolve(outPath);
        const output = join(outPath, fileName);

        // Ensure the output directory exists
        await files.makeDir(outPath);

        const sourceFramePath = await files.makeTempDir('source');
        const scaledFramePath = await files.makeTempDir('scaled');

        const upscaledFile = join(scaledFramePath, `tmp_${fileName}`);

        // ===================================================

        // Get source file metadata
        const { fps, totalFrames } = await this.$getMetadata(videoPath);

        // Extract Frames
        await this.$extractFrames(videoPath, sourceFramePath, totalFrames, debug)
            .catch(async (ex) =>
            {
                console.error('\n' + ex.stack);
                await files.rmdir(sourceFramePath);
                process.exit(1);
            });

        // Upscale frames
        await this.$upscaleFrames(sourceFramePath, scaledFramePath, scale, model, pretend, totalFrames, debug)
            .catch(async (ex) =>
            {
                console.error('\n' + ex.stack);
                await files.rmdir(sourceFramePath);
                await files.rmdir(scaledFramePath);
                process.exit(1);
            });

        // Import Frames
        await this.$importFrames(scaledFramePath, upscaledFile, fps, totalFrames, debug)
            .catch(async (ex) =>
            {
                console.error('\n' + ex.stack);
                await files.rmdir(sourceFramePath);
                await files.rmdir(scaledFramePath);
                process.exit(1);
            });

        // Merge Video Files
        await this.$mergeFiles(videoPath, upscaledFile, output, debug)
            .catch(async (ex) =>
            {
                console.error('\n' + ex.stack);
                await files.rmdir(sourceFramePath);
                await files.rmdir(scaledFramePath);
                process.exit(1);
            });

        console.log('\nCleaning up folders...')

        // Clean up after ourselves
        await files.rmdir(sourceFramePath);
        await files.rmdir(scaledFramePath);
    }
}

// ---------------------------------------------------------------------------------------------------------------------

export default new VideoManager();

// ---------------------------------------------------------------------------------------------------------------------
