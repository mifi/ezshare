#!/usr/bin/env node
'use strict';

const express = require('express');
const formidable = require('formidable');
const { join, basename } = require('path');
const fs = require('fs-extra');
const morgan = require('morgan');
const asyncHandler = require('express-async-handler');
const archiver = require('archiver');
const pMap = require('p-map');
const os = require('os');
const flatMap = require('lodash/flatMap');
const contentDisposition = require('content-disposition');
const { createProxyMiddleware } = require('http-proxy-middleware');
const qrcode = require('qrcode-terminal');
const clipboardy = require('clipboardy');
const bodyParser = require('body-parser');
const filenamify = require('filenamify');
const util = require('util');
const stream = require('stream');
const parseRange = require('range-parser');


const pipeline = util.promisify(stream.pipeline);

const maxFields = 1000;
const debug = false;

const isDirectory = async (filePath) => (await fs.lstat(filePath)).isDirectory();

module.exports = ({ sharedPath: sharedPathIn, port, maxUploadSize, zipCompressionLevel, devMode }) => {
  // console.log({ sharedPath: sharedPathIn, port, maxUploadSize, zipCompressionLevel });
  const sharedPath = sharedPathIn || process.cwd();

  function getFilePath(relPath) {
    if (relPath == null) return sharedPath;
    return join(sharedPath, join('/', relPath));
  }

  const app = express();
  // support parsing of application/json type post data
  app.use(bodyParser.json());


  if (debug) app.use(morgan('dev'));

  // NOTE: Must support non latin characters
  app.post('/api/upload', asyncHandler(async (req, res) => {
    // console.log(req.headers)

    // parse a file upload
    const form = new formidable({
      multiples: true,
      keepExtensions: true,
      uploadDir: sharedPath,
      maxFileSize: maxUploadSize,
      maxFields,
    });

    form.parse(req, async (err, fields, { files: filesIn }) => {
      if (err) {
        console.error('Upload failed', err);
        res.status(400).send({ error: { message: err.message } });
        return;
      }

      if (filesIn) {
        const files = Array.isArray(filesIn) ? filesIn : [filesIn];

        // console.log(JSON.stringify({ fields, files }, null, 2));
        console.log('Uploaded files:');
        files.forEach((f) => console.log(f.name, `(${f.size} bytes)`));

        await pMap(files, async (file) => {
          try {
            const targetPath = join(sharedPath, filenamify(file.name, { maxLength: 255 }));
            if (!(await fs.pathExists(targetPath))) await fs.rename(file.path, targetPath);
          } catch (err) {
            console.error(`Failed to rename ${file.name}`, err);
          }
        }, { concurrency: 10 });
      }
      res.end();
    });
  }));

  // NOTE: Must support non latin characters
  app.post('/api/paste', bodyParser.urlencoded({ extended: false }), asyncHandler(async (req, res) => {
    if (req.body.saveAsFile === 'true') {
      await fs.writeFile(getFilePath(`client-clipboard-${new Date().getTime()}.txt`), req.body.clipboard);
    } else {
      await clipboardy.write(req.body.clipboard);
    }
    res.end();
  }));

  // NOTE: Must support non latin characters
  app.post('/api/copy', asyncHandler(async (req, res) => {
    res.send(await clipboardy.read());
  }));

  async function serveDirZip(filePath, res) {
    const archive = archiver('zip', {
      zlib: { level: zipCompressionLevel },
    });

    res.writeHead(200, {
      'Content-Type': 'application/zip',
      // NOTE: Must support non latin characters
      'Content-disposition': contentDisposition(`${basename(filePath)}.zip`),
    });

    const promise = pipeline(archive, res);

    archive.directory(filePath, basename(filePath));
    archive.finalize();

    await promise;
  }

  async function serveResumableFileDownload({ filePath, range, res, forceDownload }) {
    if (forceDownload) {
      // Set the filename in the Content-disposition header
      res.set('Content-disposition', contentDisposition(basename(filePath)));
    }

    const { size: fileSize } = await fs.stat(filePath);

    if (range) {
      const subranges = parseRange(fileSize, range);
      if (subranges.type !== 'bytes') throw new Error(`Invalid range type ${subranges.type}`);

      if (subranges.length !== 1) throw new Error('Only a single range is supported');
      const [{ start, end }] = subranges;

      const contentLength = (end - start) + 1;

      // Set headers for resumable download
      res.status(206).set({
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': contentLength,
        'Content-Type': 'application/octet-stream',
      });

      await pipeline(fs.createReadStream(filePath, { start, end }), res);
    } else {
      // Standard download without resuming
      res.set({
        // 'Content-Type': 'application/octet-stream',
        'Content-Length': fileSize,
      });

      await pipeline(fs.createReadStream(filePath), res);
    }
  }

  app.get('/api/download', asyncHandler(async (req, res) => {
    const filePath = getFilePath(req.query.f);
    const forceDownload = req.query.forceDownload === 'true';
    const isDir = await isDirectory(filePath);

    if (isDir) {
      await serveDirZip(filePath, res);
    } else {
      const { range } = req.headers;
      await serveResumableFileDownload({ filePath, range, res, forceDownload });
    }
  }));


  app.get('/api/browse', asyncHandler(async (req, res) => {
    const curRelPath = req.query.p || '/';
    const curAbsPath = getFilePath(curRelPath);

    let readdirEntries = await fs.readdir(curAbsPath);
    readdirEntries = readdirEntries.sort(new Intl.Collator(undefined, { numeric: true }).compare);

    const entries = (await pMap(readdirEntries, async (entry) => {
      try {
        const fileAbsPath = join(curAbsPath, entry); // TODO what if a file called ".."
        const fileRelPath = join(curRelPath, entry);
        const isDir = await isDirectory(fileAbsPath);

        return {
          path: fileRelPath,
          isDir,
          fileName: entry,
        };
      } catch (err) {
        console.warn(err.message);
        // https://github.com/mifi/ezshare/issues/29
        return undefined;
      }
    }, { concurrency: 10 })).filter((f) => f);

    res.send({
      files: [
        { path: join(curRelPath, '..'), fileName: '..', isDir: true },
        ...entries
      ],
      curRelPath,
      sharedPath,
    });
  }));


  // zip file name function 
  const zipName = () => new Date(Date.now() + 19800000).toISOString().slice(0, -5) + ".zip"

  app.post('/api/zipfilesdownload', asyncHandler(async (req, res) => {
    try {
      let zipFileName = zipName();

      const form = formidable({ multiples: true });
      form.parse(req, (err, fields, filesList) => {
        let obj = JSON.parse(fields.obj);

        let files = obj.filesName;
        let currentdir = obj.currentDir

        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);

        const archive = archiver('zip', {
          zlib: { level: 9 } // Sets the compression level
        });

        archive.on('error', (err) => {
          console.error(err);
          res.status(500).send({ error: 'Error creating the zip file' });
        });

        for (let i = 0; i < files.length; i++) {
          const targetPath = join(__dirname, `.${currentdir}`, files[i]);
          // const targetPath =  path.join(__dirname, `../tmp/resource/`, files[i]);
          if (fs.existsSync(targetPath)) {
            let realname = files[i];
            archive.file(targetPath, { name: realname }); // Add each file to the archive
          }
        }
        archive.pipe(res);
        archive.finalize();
      });

    } catch (error) {
      console.error("Error:", error);
      res.status(500).send({ error: 'Internal server error' });
    }
  }))




  console.log(`Sharing path ${sharedPath}`);

  app.listen(port, () => {
    const interfaces = os.networkInterfaces();
    const urls = flatMap(Object.values(interfaces), (addresses) => addresses).filter(({ family, address }) => family === 'IPv4' && address !== '127.0.0.1').map(({ address }) => `http://${address}:${port}/`);
    if (urls.length === 0) return;
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
  });

  // Serving the frontend depending on dev/production
  if (devMode) app.use('/', createProxyMiddleware({ target: 'http://localhost:3000', ws: true }));
  else app.use('/', express.static(join(__dirname, 'ezshare-frontend/dist')));

  // Default to index because SPA
  app.use('*', (req, res) => res.sendFile(join(__dirname, 'ezshare-frontend/dist/index.html')));
};
