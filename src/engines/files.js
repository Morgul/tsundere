// ---------------------------------------------------------------------------------------------------------------------
// File Engine
// ---------------------------------------------------------------------------------------------------------------------

import path from 'node:path';
import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';

// ---------------------------------------------------------------------------------------------------------------------

class FileEngine
{
    async readFile(rootDir, filename)
    {
        return fs.readFile(path.join(rootDir, filename));
    }

    async writeFile(rootDir, filename, data)
    {
        return fs.writeFile(path.join(rootDir, filename), data);
    }

    async exists(pathToCheck)
    {
        return fs.access(pathToCheck)
            .then(() => true)
            .catch(() => false);
    }

    async copyFile(srcFile, outFile)
    {
        return fs.copyFile(srcFile, outFile);
    }

    async listFiles(dirPath, ext)
    {
        const files = await fs.readdir(dirPath);
        return files.filter((filename) => {
            return !ext || path.extname(filename) === ext;
        });
    }

    async makeDir(dirPath, recursive = true)
    {
        return fs.mkdir(dirPath, { recursive });
    }

    async makeTempDir(prefix)
    {
        return fs.mkdtemp(path.join(tmpdir(), `${ prefix }-`));
    }

    async rmdir(dirPath, recursive = true)
    {
        return fs.rm(dirPath, { recursive, force: recursive });
    }
}

// ---------------------------------------------------------------------------------------------------------------------

export default new FileEngine();

// ---------------------------------------------------------------------------------------------------------------------
