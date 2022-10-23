// ---------------------------------------------------------------------------------------------------------------------
// Upscale Engine
// ---------------------------------------------------------------------------------------------------------------------

import path from 'path';
import * as url from 'url';

import { platform } from 'node:process';
import { exec } from 'node:child_process';

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

    async upscale(inputPath, outputPath, model = UpscaleModels.ganX4PlusAnime, scale = 4)
    {
        return new Promise((resolve, reject) =>
        {
            exec(`${ this.$getBin() } -i ${ inputPath } -o ${ outputPath } -s ${ scale } -m ${ this.#modelPath } -n ${ model }`, (error) =>
            {
                if(error)
                {
                    reject(error);
                }

                resolve();
            });
        });
    }
}

// ---------------------------------------------------------------------------------------------------------------------

export default new UpscaleEngine();

// ---------------------------------------------------------------------------------------------------------------------
