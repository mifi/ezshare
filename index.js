#!/usr/bin/env node
import meow from 'meow';
import assert from 'node:assert';

import app from './app.js';

const cli = meow(`
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
`, {
  importMeta: import.meta,
  flags: {
    devMode: { type: 'boolean' },
  },
});

const port = cli.flags.port ? parseInt(cli.flags.port, 10) : undefined;
const maxUploadSize = cli.flags.maxUploadSize ? parseInt(cli.flags.maxUploadSize, 10) : undefined;
const zipCompressionLevel = cli.flags.zipCompressionLevel ? parseInt(cli.flags.zipCompressionLevel, 10) : undefined;
const devMode = !!cli.flags.devMode;

if (zipCompressionLevel != null) {
  assert(zipCompressionLevel <= 9 && zipCompressionLevel >= 0, 'zip-compression-level must be between 0 and 9');
}

app({
  sharedPath: cli.input[0],
  port: port || 8080,
  maxUploadSize: maxUploadSize || (16 * 1024 * 1024 * 1024),
  zipCompressionLevel: zipCompressionLevel != null ? zipCompressionLevel : 0,
  devMode,
});
