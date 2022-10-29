// ---------------------------------------------------------------------------------------------------------------------
// Upscale Engine
// ---------------------------------------------------------------------------------------------------------------------

import path from 'path';
import * as url from 'url';

import { platform } from 'node:process';
import { exec, spawn } from 'node:child_process';

// ---------------------------------------------------------------------------------------------------------------------

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

// ---------------------------------------------------------------------------------------------------------------------

export const UpscaleModels =
{
    animeVideoV3: 'realesr-animevideov3',
    ganX4Plus: 'realesrgan-x4plus',
    ganX4PlusAnime: 'realesrgan-x4plus-anime',
    netX4Plus: 'realesrnet-x4plus'
}

// ---------------------------------------------------------------------------------------------------------------------

class UpscaleEngine
{
    #baseBinPath = path.resolve(__dirname, '..', '..', 'bin');
    #modelPath = path.join(this.#baseBinPath, 'models');

    // Executables
    #macBin = path.join(this.#baseBinPath, 'realesrgan', 'mac', 'realesrgan-ncnn-vulkan');
    #linBin = path.join(this.#baseBinPath, 'realesrgan', 'linux', 'realesrgan-ncnn-vulkan');
    #winBin = path.join(this.#baseBinPath, 'realesrgan', 'win', 'realesrgan-ncnn-vulkan.exe');

    $getBin()
    {
        if(platform === 'darwin')
        {
            return this.#macBin;
        }
        else if(platform === 'linux')
        {
            return this.#linBin;
        }
        else if(platform === 'win32')
        {
            return this.#winBin
        }
        else
        {
            throw new Error(`Unknown Platform '${ platform }'.`);
        }
    }

    async upscale(inputPath, outputPath, model = UpscaleModels.ganX4PlusAnime, scale = 4, startHandler = () => {}, progressHandler = () => {})
    {
        const args = [
            '-i', `${inputPath}`,
            '-o', `${outputPath}`,
            '-s', `${scale}`,
            '-m', `${this.#modelPath}`,
            '-n', `${model}`,
            '-v'
        ];

        return new Promise((resolve, reject) =>
        {
            let count = 0;
            const startTime = new Date().getTime();

            // Send the command as the start parameter
            startHandler(`${ this.$getBin() } ${ args.join(' ') }`);

            const realesr = spawn(this.$getBin(), args);

            realesr.stderr.on("data", (data) =>
            {
                // Convert buffer to string
                data = data.toString();

                // If we get a done message, we know something's completed
                if (data.trim().endsWith('done'))
                {
                    count += 1;
                    const endTime = new Date().getTime();
                    progressHandler({ frames: count, fps: (count / ((endTime - startTime) / 1000)).toFixed(2) });
                }
            });

            realesr.on("error", (err) =>
            {
                console.error("err:", err);
                reject(err.stack);
            });

            realesr.on('close', (code) =>
            {
                if (code === 0)
                {
                    resolve();
                }
                else
                {
                    reject(code);
                }
            });
        });
    }
}

// ---------------------------------------------------------------------------------------------------------------------

export default new UpscaleEngine();

// ---------------------------------------------------------------------------------------------------------------------
