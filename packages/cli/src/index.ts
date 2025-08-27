#!/usr/bin/env node

import assert from 'node:assert';
import { dirname } from 'node:path';
import qrcode from 'qrcode-terminal';

import App, { parseArgs } from '@ezshare/lib';


const args = parseArgs(process.argv.slice(2));

const indexPath = await import.meta.resolve?.('@ezshare/web/dist/index.html');
assert(indexPath);
const webPath = dirname(indexPath);

const { start, runStartupCheck, getUrls, sharedPath } = App({ ...args, webPath });

const urls = getUrls();
if (urls.length === 0) {
  console.warn('No network interfaces detected.');
} else {
  await runStartupCheck();

  await start();

  console.log('Server listening:');
  urls.forEach((url) => {
    console.log();
    console.log(`Scan this QR code on your phone or enter ${url}`);
    console.log();
    qrcode.generate(url);
  });
  if (urls.length > 1) {
    console.log('Note that there are multiple QR codes above, one for each network interface. (scroll up)');
  }

  console.log(`Sharing path ${sharedPath}`);
}
