// ---------------------------------------------------------------------------------------------------------------------
// MKVMerge Engine
// ---------------------------------------------------------------------------------------------------------------------

import { spawn } from "node:child_process";

import which from "which";

// ---------------------------------------------------------------------------------------------------------------------

const progressMsgRE = /#GUI#progress/g

// ---------------------------------------------------------------------------------------------------------------------

class MKVMergeEngine
{
    // We don"t need a path, necessarily.
    mkvmergeBin = "mkvmerge";

    async init()
    {
        this.mkvmergeBin = await which("mkvmerge");
    }

    async mergeVideo(originalFile, upscaledFile, outputFile, startHandler = () => {}, progressHandler = () => {})
    {
        const args = [
            '--output', `${outputFile}`,
            '--no-video',
            '--language', '1:en',
            '--track-name', '1:Stereo',
            '--sub-charset', '2:UTF-8',
            '--language', '2:en',
            '--track-name', '2:English',
            `${originalFile}`,
            '--no-track-tags',
            '--no-global-tags',
            '--language', '0:und',
            `${upscaledFile}`,
            '--track-order', '1:0,0:1,0:2',
            '--gui-mode'
        ];

        return new Promise((resolve, reject) =>
        {
            // Send the command as the start parameter
            startHandler(`${ this.mkvmergeBin } ${ args.join(' ') }`);

            const mkvmerge = spawn(this.mkvmergeBin, args);

            mkvmerge.stdout.on("data", (data) =>
            {
                // Convert buffer to string
                data = data.toString();

                if (progressMsgRE.test(data))
                {
                    const percent = data.replace('#GUI#progress ', '').replace('%', '').trim();
                    progressHandler({ percent });
                }
            });

            mkvmerge.on("error", (err) =>
            {
                console.error("err:", err);
                reject(err.stack);
            });

            mkvmerge.on('close', (code) =>
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

export default new MKVMergeEngine();

// ---------------------------------------------------------------------------------------------------------------------
