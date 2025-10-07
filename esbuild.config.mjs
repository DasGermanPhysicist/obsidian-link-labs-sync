import esbuild from 'esbuild';
import { readFile } from 'node:fs/promises';

const banner = {
  js: `/*
THIS IS A GENERATED FILE. DO NOT EDIT DIRECTLY.
*/`,
};

const ctx = await esbuild.context({
  entryPoints: ['src/main.ts'],
  bundle: true,
  outfile: 'main.js',
  format: 'cjs',
  platform: 'browser',
  target: 'es2020',
  banner,
  sourcemap: false,
  external: [
    'obsidian',
    'electron',
    'codemirror',
    '@codemirror/view',
    '@codemirror/state',
    '@codemirror/language',
  ],
});

if (process.argv.includes('--watch')) {
  await ctx.watch();
  console.log('esbuild watching...');
} else {
  await ctx.rebuild();
  await ctx.dispose();
  console.log('esbuild build complete');
}
