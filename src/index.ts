#!/usr/bin/env node
import yargs from 'yargs/yargs';
import assert from 'node:assert';

import app from './app.js';


const usage = `
  Usage
    $ ezshare [shared_path]

  Options
    [shared_path]  If omitted, will use current directory
    --port  Port to listen (default 8080)
    --max-upload-size  Max upload file size (default 16 GB)
    --zip-compression-level  ZIP compression level (default 0, no compression - faster)

    Examples
    $ ezshare
    Shares all files and folders under the current directory (cd)

    $ ezshare /Users/me
    Shares all files and folders under /Users/me
`;

const { port, maxUploadSize, zipCompressionLevel, devMode, _ } = yargs(process.argv.slice(2)).usage(usage).options({
  devMode: { type: 'boolean', default: false },
  port: { type: 'number', default: 8080 },
  maxUploadSize: { type: 'number', default: 16 * 1024 * 1024 * 1024 },
  zipCompressionLevel: { type: 'number', default: 0 },
}).parseSync();

if (zipCompressionLevel != null) {
  assert(zipCompressionLevel <= 9 && zipCompressionLevel >= 0, 'zip-compression-level must be between 0 and 9');
}

const sharedPath = _[0];
assert(typeof sharedPath === 'string' || sharedPath == null);

app({
  sharedPath,
  port,
  maxUploadSize,
  zipCompressionLevel,
  devMode,
});
