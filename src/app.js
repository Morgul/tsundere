// ---------------------------------------------------------------------------------------------------------------------
// Tsundere Video Upscaler
// ---------------------------------------------------------------------------------------------------------------------

import { basename } from 'node:path';
import { program } from "commander";
import humanizeDuration from 'humanize-duration';

// Managers
import videoMan from "./managers/video.js";

// ---------------------------------------------------------------------------------------------------------------------

program
    .requiredOption('-i, --input <path to video file>', 'The source video to upscale.')
    .requiredOption('-o, --output <output directory>', 'The directory to output the upscaled video to.')
    .option('-s, --scale <scale>', 'How much to upscale the video.', '2')
    .option('-m, --model <model>', 'The upscaler model. One of: \'animeVideoV3\', \'ganX4Plus\', \'ganX4PlusAnime\', \'netX4Plus\'.')
    .parse();

// ---------------------------------------------------------------------------------------------------------------------

let { input, output, scale } = program.opts();

if (scale)
{
    scale = parseInt(scale) ?? 2;
}

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

console.log(`Begining upscaling '${ basename(input) }' or whatever...\n`);

const startTime = new Date().getTime();
await videoMan.upscaleVideo(input, output, scale)
const endTime = new Date().getTime();

const duration = endTime - startTime;

console.log(`\nDone in ${ humanizer(duration) }. Not that you care, or anything.`);

// ---------------------------------------------------------------------------------------------------------------------
