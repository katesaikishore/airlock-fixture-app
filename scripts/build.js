'use strict';
// "Build": copy public/ to dist/public and write dist/build-info.json (what a real build step would leave behind).
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist');
fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(path.join(root, 'public'), path.join(out, 'public'), { recursive: true });
fs.writeFileSync(path.join(out, 'build-info.json'), JSON.stringify({ builtAt: new Date().toISOString(), node: process.version }, null, 2));
console.log('build ok: dist/public and dist/build-info.json');
