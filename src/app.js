// ---------------------------------------------------------------------------------------------------------------------
// Tsundere Video Upscaler
// ---------------------------------------------------------------------------------------------------------------------

import { basename, resolve } from 'node:path';
import { program } from "commander";
import humanizeDuration from 'humanize-duration';

// Engines
import mkvmergeEng from './engines/mkvmerge.js';
import { UpscaleModels } from './engines/upscaler.js';

// Managers
import videoMan from "./managers/video.js";
import { debug } from 'node:console';

// ---------------------------------------------------------------------------------------------------------------------

program
    .requiredOption('-i, --input <path to video file>', 'The source video to upscale.')
    .requiredOption('-o, --output <output directory>', 'The directory to output the upscaled video to.')
    .option('-s, --scale <scale>', 'How much to upscale the video.', '2')
    .option('-m, --model <model>', 'The upscaler model. One of: \'animeVideoV3\', \'ganX4Plus\', \'ganX4PlusAnime\', \'netX4Plus\'.')
    .option('-p, --pretend', 'Pretend to do the upscaling. (Useful for debugging.)')
    .option('-d, --debug-mode', 'Enable debugging.')
    .parse();

// ---------------------------------------------------------------------------------------------------------------------

let { input, output, scale, pretend, debugMode } = program.opts();

// Make pretend a real bool
pretend = !!pretend;

// Make debug a real bool
debugMode = !!debugMode;

if (scale)
{
    scale = parseInt(scale) ?? 2;
}

// ---------------------------------------------------------------------------------------------------------------------

// Get `mkvmerge` binary
await mkvmergeEng.init();

// ---------------------------------------------------------------------------------------------------------------------

const humanizer = humanizeDuration.humanizer({
    language: "shortEn",
    languages: {
        shortEn: {
            y: () => "y",
            mo: () => "mo",
            w: () => "w",
            d: () => "d",
            h: () => "h",
            m: () => "m",
            s: () => "s",
            ms: () => "ms",
        },
    },
});

console.log(`Begining upscaling '${ basename(input) }'...\n`);

const startTime = new Date().getTime();
await videoMan.upscaleVideo(input, output, scale, UpscaleModels.animeVideoV3, pretend)
const endTime = new Date().getTime();

const duration = endTime - startTime;

console.log(`\nDone in ${ humanizer(duration) }.`);

// ---------------------------------------------------------------------------------------------------------------------
