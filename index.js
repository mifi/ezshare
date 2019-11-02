#!/usr/bin/env node
'use strict';

const express = require('express');
const formidable = require('formidable');
const path = require('path');
const fs = require('fs-extra');
const util = require('util');
const morgan = require('morgan');
const asyncHandler = require('express-async-handler');
const archiver = require('archiver');
const pMap = require('p-map');
const os = require('os');
const flatMap = require('lodash/flatMap');
const contentDisposition = require('content-disposition');

const port = 8080;
const maxFileSize = 4000 * 1024 * 1024;
const maxFields = 1000;
const compressionLevel = 0;
const dirPath = process.cwd();


function getFilePath(relPath) {
  return path.join(dirPath, path.join('/', relPath));
}
async function isDirectory(filePath) {
  return (await fs.lstat(filePath)).isDirectory();
}

function getContentDisposition(basename) {
  return contentDisposition(basename);
}

const app = express();

app.use(morgan('dev'));

app.get('/', (req, res) => {
  res.redirect('/browse');
});

app.get('/browse', asyncHandler(async (req, res) => {
  const curPathRel = req.query.p || '/';
  const curPath = getFilePath(curPathRel);
  const readdirEntries = await fs.readdir(curPath);

  const filesStr = (await pMap(['.', '..', ...readdirEntries], async (e) => {
    const filePath = path.join(curPath, e); // TODO what if a file called ".."
    const filePathRel = path.join(curPathRel, e);
    const isDir = await isDirectory(filePath);

    const dlHref = `/download?f=${encodeURIComponent(filePathRel)}&_=${new Date().getTime()}`;
    const href = isDir ? `/browse?p=${encodeURIComponent(filePathRel)}` : dlHref;
    const explicitDl = isDir ? `<a style="margin-left: 30px" href="${dlHref}">ZIP</a>` : '';
    return `<div><a href="${href}">${e}</a>${explicitDl}</div>`;
  }, { concurrency: 10 })).join('');

  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(`
    <form action="/upload" enctype="multipart/form-data" method="post">
      <h2>Upload file(s)</h2>
      <input type="file" name="upload" multiple="multiple"><br>
      <input type="submit" value="Upload">
    </form>
    
    <div>
      <h2>Download files</h2>

      ${filesStr}
    </div>
  `);
}));

// NOTE: Must support non latin characters
app.post('/upload', asyncHandler(async (req, res) => {
  // parse a file upload
  var form = new formidable.IncomingForm();
  form.uploadDir = dirPath;
  form.keepExtensions = true;
  form.maxFileSize = maxFileSize;
  form.maxFields = maxFields;

  form.parse(req, function(err, fields, files) {
    if (err) {
      console.error('Upload failed', err);
      res.send('Upload failed');
      return;
    }

    console.log(util.inspect({ fields: fields, files: files }));
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(`Upload finished! <a href="/">Back</a>`);
  });
}));

async function serveDirZip(filePath, res) {
  const archive = archiver('zip', {
    zlib: { level: compressionLevel },
  });

  res.writeHead(200, {
    'Content-Type': 'application/zip',
    // NOTE: Must support non latin characters
    'Content-disposition': getContentDisposition(`${path.basename(filePath)}.zip`),
  });
  archive.pipe(res);

  archive.directory(filePath, path.basename(filePath));
  archive.finalize();
  // res.end();
}

app.get('/download', asyncHandler(async (req, res) => {
  const filePath = getFilePath(req.query.f);
  const isDir = await isDirectory(filePath);

  if (isDir) {
    await serveDirZip(filePath, res);
  } else {
    // NOTE: Must support non latin characters
    res.set('Content-disposition', getContentDisposition(path.basename(filePath)));
    fs.createReadStream(filePath).pipe(res);
  }
 }));

app.listen(port, () => {
  const interfaces = os.networkInterfaces();
  const urls = flatMap(Object.values(interfaces), (addresses) => addresses).filter(({ family }) => family === 'IPv4').map(({ address }) => `http://${address}:${port}/`);
  if (urls.length === 0) return;
  console.log(`Listening on:\n${urls.join('\n')}`);
});
