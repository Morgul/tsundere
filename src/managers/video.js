// ---------------------------------------------------------------------------------------------------------------------
// Video Manager
// ---------------------------------------------------------------------------------------------------------------------

import { join, resolve, basename } from 'node:path';

import bb from 'bluebird';
import cliProgress from 'cli-progress';
import colors from 'ansi-colors';

// Engines
import ffmpeg from '../engines/ffmpeg.js';
import upscaler, { UpscaleModels } from '../engines/upscaler.js';
import files from '../engines/files.js';

// ---------------------------------------------------------------------------------------------------------------------

class VideoManager
{
    async $upscaleDir(sourcePath, outPath, scale, model, progressHandler = () => {})
    {
        let count = 0;
        const frames = await files.listFiles(sourcePath, '.png');
        const startTime = new Date().getTime();
        await bb.map(frames, async (fileName, index) =>
        {
            const input = join(sourcePath, fileName);
            const output = join(outPath, fileName);

            // Upscale the frames
            await upscaler.upscale(input, output, model, scale);
            count++;

            // Report Progress
            const endTime = new Date().getTime();
            progressHandler({ frames: count, fps: (count / ((endTime - startTime) / 1000)).toFixed(2) });
        }, { concurrency: 6 });
    }

    async upscaleVideo(videoPath, outPath, scale = 2, model = UpscaleModels.animeVideoV3)
    {
        // Progress Bars
        const framesBar = new cliProgress.SingleBar({
            format: 'Extracting Frames |' + colors.cyan('{bar}') + '| {percentage}% || {frames}/{totalFrames} || FPS: {fps}',
            barCompleteChar: '\u2588',
            barIncompleteChar: '\u2591',
            hideCursor: true
        });

        const upscaleBar = new cliProgress.SingleBar({
            format: 'Upscaling Frames  |' + colors.cyan('{bar}') + '| {percentage}% || {frames}/{totalFrames} || FPS: {fps}',
            barCompleteChar: '\u2588',
            barIncompleteChar: '\u2591',
            hideCursor: true
        });

        const importBar = new cliProgress.SingleBar({
            format: 'Importing Frames  |' + colors.cyan('{bar}') + '| {percentage}% || {frames}/{totalFrames} || FPS: {fps}',
            barCompleteChar: '\u2588',
            barIncompleteChar: '\u2591',
            hideCursor: true
        });

        const mergeBar = new cliProgress.SingleBar({
            format: 'Rebuilding Video  |' + colors.cyan('{bar}') + '| {percentage}% || {frames}/{totalFrames} || FPS: {fps} || Step {step} of 2',
            barCompleteChar: '\u2588',
            barIncompleteChar: '\u2591',
            hideCursor: true
        });

        // ===================================================
        // Directory Manipulation
        // ===================================================

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
        // ===================================================

        const inputMetadata = await ffmpeg.getMetadata(videoPath);
        const fps = (inputMetadata.streams.filter((stream) => stream.codec_type === 'video')[0] ?? {})
            ?.r_frame_rate;
        const totalFrames = (inputMetadata.streams.filter((stream) => stream.codec_type === 'video')[0] ?? {})
            ?.nb_read_frames;

        // ===================================================
        // Extract Frames
        // ===================================================

        framesBar.start(totalFrames, 0, {
            frames: 0,
            totalFrames,
            fps: 0
        });

        await ffmpeg.extractFrames(videoPath, sourceFramePath, (progress) =>
        {
            framesBar.update(progress.frames, {
                frames: progress.frames,
                fps: progress.currentFps
            });
        });

        // Ensure a final update
        framesBar.update(totalFrames, {
            frames: totalFrames
        });

        framesBar.stop();

        // ===================================================
        // Upscale frames
        // ===================================================

        upscaleBar.start(totalFrames, 0, {
            frames: 0,
            fps: 0,
            totalFrames,
        });

        await this.$upscaleDir(sourceFramePath, scaledFramePath, scale, model, ({ frames, fps }) =>
        {
            upscaleBar.update(frames, {
                frames,
                fps
            });
        });

        // Ensure a final update
        upscaleBar.update(totalFrames, {
            frames: totalFrames
        });

        upscaleBar.stop();

        // ===================================================
        // Import Frames
        // ===================================================

        importBar.start(totalFrames, 0, {
            frames: 0,
            fps: 0,
            totalFrames,
        });

        await ffmpeg.importFrames(scaledFramePath, upscaledFile, fps, (progress) =>
        {
            importBar.update(progress.frames, {
                frames: progress.frames,
                fps: progress.currentFps
            });
        });

        // Ensure a final update
        importBar.update(totalFrames, {
            frames: totalFrames
        });

        importBar.stop();

        // ===================================================
        // Merge Video Files
        // ===================================================

        mergeBar.start(totalFrames, 0, {
            frames: 0,
            fps: 0,
            totalFrames,
            step: 1
        });

        await ffmpeg.replaceVideo(videoPath, upscaledFile, upscaledFile.replace('.mkv', '.mp4'), (progress) =>
        {
            mergeBar.update(progress.frames, {
                frames: progress.frames,
                fps: progress.currentFps
            });
        });

        // Reset for Step 2
        mergeBar.update(0, {
            frames: 0,
            step: 2
        });

        await ffmpeg.mergeSubtitles(upscaledFile.replace('.mkv', '.mp4'), videoPath, output, (progress) =>
        {
            mergeBar.update(progress.frames, {
                frames: progress.frames,
                fps: progress.currentFps
            });
        });

        // Ensure a final update
        mergeBar.update(totalFrames, {
            frames: totalFrames
        });

        mergeBar.stop();
    }
}

// ---------------------------------------------------------------------------------------------------------------------

export default new VideoManager();

// ---------------------------------------------------------------------------------------------------------------------
