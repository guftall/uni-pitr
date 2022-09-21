import { build } from 'esbuild';
import fs from 'fs'

const packageObject = JSON.parse(fs.readFileSync('./package.json'))

let externals = []

for (let name in packageObject.dependencies) {
    externals.push(name)
}
for (let name in packageObject.devDependencies) {
    externals.push(name)
}

(async () => {
    await build({
        entryPoints: ['./src/start.ts'],
        bundle: true,
        minify: process.env.ESBUILD_SOURCEMAP != 'true',
        minifySyntax: process.env.ESBUILD_SOURCEMAP != 'true',
        minifyWhitespace: process.env.ESBUILD_SOURCEMAP != 'true',
        watch: process.env.ESBUILD_WATCH == 'true',
        sourcemap: process.env.ESBUILD_SOURCEMAP == 'true',
        external: externals,
        platform: 'node',
        target: 'es2020',
        format: 'esm',
        outfile: './dist/index.js',
        logLevel: 'debug'
    });
})();