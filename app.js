import express from 'express';
import Formidable from 'formidable';
import { createReadStream } from 'node:fs';
import { join, basename } from 'node:path';
import assert from 'node:assert';
import * as fs from 'node:fs/promises';
import morgan from 'morgan';
import asyncHandler from 'express-async-handler';
import archiver from 'archiver';
import pMap from 'p-map';
import os from 'node:os';
import flatMap from 'lodash/flatMap.js';
import contentDisposition from 'content-disposition';
import { createProxyMiddleware } from 'http-proxy-middleware';
import qrcode from 'qrcode-terminal';
import clipboardy from 'clipboardy';
import bodyParser from 'body-parser';
import filenamify from 'filenamify';
import util from 'node:util';
import stream from 'node:stream';
import parseRange from 'range-parser';


const pipeline = util.promisify(stream.pipeline);

const maxFields = 1000;
const debug = false;

const pathExists = (path) => fs.access(path, fs.constants.F_OK).then(() => true).catch(() => false);

export default ({ sharedPath: sharedPathIn, port, maxUploadSize, zipCompressionLevel, devMode }) => {
  // console.log({ sharedPath: sharedPathIn, port, maxUploadSize, zipCompressionLevel });
  const sharedPath = sharedPathIn || process.cwd();

  async function getFileAbsPath(relPath) {
    if (relPath == null) return sharedPath;
    const absPath = join(sharedPath, join('/', relPath));
    const realPath = await fs.realpath(absPath);
    assert(realPath.startsWith(sharedPath), 'Path must be within shared path');
    return realPath;
  }

  const app = express();

  if (debug) app.use(morgan('dev'));

  // NOTE: Must support non latin characters
  app.post('/api/upload', bodyParser.json(), asyncHandler(async (req, res) => {
    // console.log(req.headers)
    const uploadDirPathIn = req.query.path || '/';

    const uploadDirPath = await getFileAbsPath(uploadDirPathIn);

    // parse a file upload
    const form = Formidable({
      keepExtensions: true,
      uploadDir: uploadDirPath,
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
        console.log('Uploaded files to', uploadDirPath);
        files.forEach((f) => console.log(f.originalFilename, `(${f.size} bytes)`));

        await pMap(files, async (file) => {
          try {
            const targetPath = join(uploadDirPath, filenamify(file.originalFilename, { maxLength: 255 }));
            if (!(await pathExists(targetPath))) await fs.rename(file.filepath, targetPath); // to prevent overwrites
          } catch (err2) {
            console.error(`Failed to rename ${file.originalFilename}`, err2);
          }
        }, { concurrency: 10 });
      }
      res.end();
    });
  }));

  // NOTE: Must support non latin characters
  app.post('/api/paste', bodyParser.urlencoded({ extended: false }), asyncHandler(async (req, res) => {
    // eslint-disable-next-line unicorn/prefer-ternary
    if (req.body.saveAsFile === 'true') {
      await fs.writeFile(join(sharedPath, `client-clipboard-${Date.now()}.txt`), req.body.clipboard);
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

      await pipeline(createReadStream(filePath, { start, end }), res);
    } else {
      // Standard download without resuming
      res.set({
        // 'Content-Type': 'application/octet-stream',
        'Content-Length': fileSize,
      });

      await pipeline(createReadStream(filePath), res);
    }
  }

  app.get('/api/download', asyncHandler(async (req, res) => {
    const filePath = await getFileAbsPath(req.query.f);
    const forceDownload = req.query.forceDownload === 'true';

    const lstat = await fs.lstat(filePath);
    if (lstat.isDirectory()) {
      await serveDirZip(filePath, res);
    } else {
      const { range } = req.headers;
      await serveResumableFileDownload({ filePath, range, res, forceDownload });
    }
  }));

  app.get('/api/browse', asyncHandler(async (req, res) => {
    const browseRelPath = req.query.p || '/';
    const browseAbsPath = await getFileAbsPath(browseRelPath);

    let readdirEntries = await fs.readdir(browseAbsPath, { withFileTypes: true });
    readdirEntries = readdirEntries.sort(({ name: a }, { name: b }) => new Intl.Collator(undefined, { numeric: true }).compare(a, b));

    const entries = (await pMap(readdirEntries, async (entry) => {
      try {
        // TODO what if a file called ".."
        const entryRelPath = join(browseRelPath, entry.name);
        const entryAbsPath = join(browseAbsPath, entry.name);
        const entryRealPath = await fs.realpath(entryAbsPath);

        if (!entryRealPath.startsWith(sharedPath)) {
          console.warn('Ignoring symlink pointing outside shared path', entryRealPath);
          return [];
        }

        const stat = await fs.lstat(entryRealPath);
        const isDir = stat.isDirectory();

        return [{
          path: entryRelPath,
          isDir,
          fileName: entry.name,
        }];
      } catch (err) {
        console.warn(err.message);
        // https://github.com/mifi/ezshare/issues/29
        return [];
      }
    }, { concurrency: 10 })).flat();

    res.send({
      files: [
        { path: join(browseRelPath, '..'), fileName: '..', isDir: true },
        ...entries,
      ],
      cwd: browseRelPath,
      sharedPath,
    });
  }));


  app.get('/api/zip-files', asyncHandler(async (req, res) => {
    const zipFileName = `${new Date().toISOString().replace(/^(\d+-\d+-\d+)T(\d+):(\d+):(\d+).*$/, '$1 $2.$3.$3')}.zip`;
    const { files: filesJson } = req.query;

    const files = JSON.parse(filesJson);

    const archive = archiver('zip', { zlib: { level: zipCompressionLevel } });

    res.writeHead(200, {
      'Content-Type': 'application/zip',
      // NOTE: Must support non latin characters
      'Content-Disposition': contentDisposition(zipFileName),
    });

    const promise = pipeline(archive, res);

    await pMap(files, async (file) => {
      const absPath = await getFileAbsPath(file);
      // Add each file to the archive:
      archive.file(absPath, { name: file });
    }, { concurrency: 1 });

    archive.finalize();

    await promise;
  }));


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
