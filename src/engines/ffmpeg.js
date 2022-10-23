// ---------------------------------------------------------------------------------------------------------------------
// FFMPEG Engine
// ---------------------------------------------------------------------------------------------------------------------

import path from 'node:path';
import ffmpeg from 'fluent-ffmpeg';

// ---------------------------------------------------------------------------------------------------------------------

class FFMPEGEngine
{
    /**
     * Get video metadata.
     *
     * @param {string} videoPath - The path to the video.
     * @returns Returns a Promise that resolves with the video metadata.
     */
    async getMetadata(videoPath)
    {
        return new Promise((resolve, reject) =>
        {
            ffmpeg(videoPath)
                .ffprobe(['-count_frames'], (err, data) =>
                {
                    if (err)
                    {
                        reject(err);
                    }

                    resolve(data);
                });
        });
    }

    /**
     * Extracts frames from a video into png files.
     *
     * @param {string} videoPath - The path to the video.
     * @param {string} framePath - The path to save the frames.
     * @param {Function} progressHandler - A handler for the progress event.
     * @param {string} prefix - the prefix for the frame files.
     *
     * @returns Returns a Promise that completes once the frames are extracted.
     */
    async extractFrames(videoPath, framePath, progressHandler = () => {}, prefix = 'frame')
    {
        return new Promise((resolve, reject) =>
        {
            ffmpeg(videoPath)
                .addOption('-qscale:v 1')
                .addOption('-qmin 1')
                .addOption('-qmax 1')
                .addOption('-vsync 0')
                .output(path.join(framePath, `${prefix}-%08d.png`))
                .on('progress', progressHandler || (() => {}))
                .on('error', (err) => reject(err))
                .on('end', () => resolve())
                .run();
        });
    }

    /**
     * Imports frames into a new video.
     *
     * @param {string} framePath - The path to save the frames.
     * @param {string} outPath - The path to save the video.
     * @param {string} fps - The fps of the video to create.
     * @param {Function} progressHandler - A handler for the progress event.
     * @param {string} prefix - the prefix for the frame files.
     * @param {string} ext - The file extension of the frame images.
     *
     * @returns Returns a Promise that completes once the frames are imported.
     */
    async importFrames(framePath, outPath, fps, progressHandler = () => {}, prefix = 'frame', ext = 'png')
    {
        return new Promise((resolve, reject) =>
        {
            ffmpeg(path.join(framePath, `${prefix}-%08d.${ ext }`))
                .addOption(`-r ${ fps }`)
                .addOption('-c:v libx264')
                .addOption('-pix_fmt yuv420p')
                .output(outPath)
                .on('progress', progressHandler || (() => {}))
                .on('error', (err) => reject(err))
                .on('end', () => resolve())
                .run();
        });
    }

    async replaceVideo(sourceFile, replacementFile, outFile, progressHandler = () => {})
    {
        return new Promise((resolve, reject) =>
        {
            ffmpeg(sourceFile)
                .addInput(replacementFile)
                .addOption('-map 1:v:0')
                .addOption('-map 0:a')
                .addOption('-c:v libx264')
                .addOption('-c:a aac')
                .output(outFile)
                .on('progress', progressHandler || (() => {}))
                .on('error', (err) => reject(err))
                .on('end', () => resolve())
                .run();
        });
    }

    async mergeSubtitles(newFile, sourceFile, outFile, progressHandler = () => {})
    {
        return new Promise((resolve, reject) =>
        {
            ffmpeg(newFile)
                .addInput(sourceFile)
                .addOption('-map 0')
                .addOption('-map 1:s')
                .addOption('-c copy')
                .addOption('-c:s srt')
                .output(outFile)
                .on('progress', progressHandler || (() => {}))
                .on('error', (err) => reject(err))
                .on('end', () => resolve())
                .run();
        });
    }
}


// ---------------------------------------------------------------------------------------------------------------------

export default new FFMPEGEngine();

// ---------------------------------------------------------------------------------------------------------------------
