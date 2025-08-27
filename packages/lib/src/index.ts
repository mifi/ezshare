import express, { Response } from 'express';
import Formidable from 'formidable';
import { createReadStream } from 'node:fs';
import { join, basename, relative, resolve as resolvePath } from 'node:path';
import assert from 'node:assert';
import * as fs from 'node:fs/promises';
import morgan from 'morgan';
import asyncHandler from 'express-async-handler';
import archiver from 'archiver';
import pMap from 'p-map';
import os from 'node:os';
import contentDisposition from 'content-disposition';
import { createProxyMiddleware } from 'http-proxy-middleware';
import clipboardy from 'clipboardy';
import bodyParser from 'body-parser';
import filenamify from 'filenamify';
import stream from 'node:stream/promises';
import parseRange from 'range-parser';
import isPathInside from 'is-path-inside';
import basicAuth from 'basic-auth';
import { timingSafeEqual } from 'node:crypto';

import Ffmpeg from './ffmpeg.js';

export { default as parseArgs } from './args.js';


const maxFields = 1000;
const debug = false;

const pathExists = (path: string) => fs.access(path, fs.constants.F_OK).then(() => true).catch(() => false);

export default ({ sharedPath: sharedPathIn, port, maxUploadSize, zipCompressionLevel, devMode, auth, ffmpegPath, webPath }: {
  sharedPath: string | undefined,
  port: number,
  maxUploadSize: number,
  zipCompressionLevel: number,
  devMode: boolean,
  auth?: { username: string, password: string } | undefined,
  ffmpegPath: string,
  webPath: string,
}) => {
  const ffmpeg = Ffmpeg({ ffmpegPath });

  // console.log({ sharedPath: sharedPathIn, port, maxUploadSize, zipCompressionLevel });
  const sharedPath = sharedPathIn ? resolvePath(sharedPathIn) : process.cwd();

  function arePathsEqual(path1: string, path2: string) {
    return relative(path1, path2) === '';
  }

  async function getFileAbsPath(relPath: string | undefined) {
    if (relPath == null) return sharedPath;
    const absPath = join(sharedPath, join('/', relPath));
    const realPath = await fs.realpath(absPath);
    assert(isPathInside(realPath, sharedPath) || arePathsEqual(realPath, sharedPath), `Path must be within shared path ${realPath} ${sharedPath}`);
    return realPath;
  }

  const app = express();

  app.use((req, res, next) => {
    if (auth != null) {
      const authRes = basicAuth(req);
      try {
        assert(authRes);
        assert(timingSafeEqual(Buffer.from(authRes.name, 'utf8'), Buffer.from(auth.username, 'utf8'))
          && timingSafeEqual(Buffer.from(authRes.pass, 'utf8'), Buffer.from(auth.password, 'utf8')));
      } catch {
        res.set('WWW-Authenticate', 'Basic realm="ezshare"');
        res.status(401).send('Authentication required.');
        return;
      }
    }

    next();
  });

  if (debug) app.use(morgan('dev'));

  // NOTE: Must support non latin characters
  app.post('/api/upload', bodyParser.json(), asyncHandler(async (req, res) => {
    // console.log(req.headers)
    const uploadDirPathIn = req.query['path'] || '/';
    assert(typeof uploadDirPathIn === 'string');

    const uploadDirPath = await getFileAbsPath(uploadDirPathIn);

    // parse a file upload
    const form = Formidable({
      keepExtensions: true,
      uploadDir: uploadDirPath,
      maxFileSize: maxUploadSize,
      maxFields,
    });

    form.parse(req, async (err, _fields, { files: filesIn }) => {
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
            const targetPath = join(uploadDirPath, filenamify(file.originalFilename ?? 'file', { maxLength: 255 }));
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
  app.post('/api/copy', asyncHandler(async (_req, res) => {
    res.send(await clipboardy.read());
  }));

  async function serveDirZip(filePath: string, res: Response) {
    const archive = archiver('zip', {
      zlib: { level: zipCompressionLevel },
    });

    res.writeHead(200, {
      'Content-Type': 'application/zip',
      // NOTE: Must support non latin characters
      'Content-disposition': contentDisposition(`${basename(filePath)}.zip`),
    });

    const promise = stream.pipeline(archive, res);

    archive.directory(filePath, basename(filePath));
    archive.finalize();

    await promise;
  }

  async function serveResumableFileDownload({ filePath, range, res, forceDownload }: {
    filePath: string,
    range: string | undefined,
    res: Response,
    forceDownload: boolean,
  }) {
    if (forceDownload) {
      // Set the filename in the Content-disposition header
      res.set('Content-disposition', contentDisposition(basename(filePath)));
    }

    const { size: fileSize } = await fs.stat(filePath);

    if (range) {
      const subranges = parseRange(fileSize, range);
      assert(typeof subranges !== 'number');
      if (subranges.type !== 'bytes') throw new Error(`Invalid range type ${subranges.type}`);

      if (subranges.length !== 1) throw new Error('Only a single range is supported');
      const { start, end } = subranges[0]!;

      const contentLength = (end - start) + 1;

      // Set headers for resumable download
      res.status(206).set({
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': contentLength,
        'Content-Type': 'application/octet-stream',
      });

      await stream.pipeline(createReadStream(filePath, { start, end }), res);
    } else {
      // Standard download without resuming
      res.set({
        // 'Content-Type': 'application/octet-stream',
        'Content-Length': fileSize,
      });

      await stream.pipeline(createReadStream(filePath), res);
    }
  }

  app.get('/api/download', asyncHandler(async (req, res) => {
    const { f } = req.query;
    assert(typeof f === 'string');
    const filePath = await getFileAbsPath(f);
    const forceDownload = req.query['forceDownload'] === 'true';

    const lstat = await fs.lstat(filePath);
    if (lstat.isDirectory()) {
      await serveDirZip(filePath, res);
    } else {
      const { range } = req.headers;
      await serveResumableFileDownload({ filePath, range, res, forceDownload });
    }
  }));

  app.get('/api/thumbnail', asyncHandler(async (req, res) => {
    const { f } = req.query;
    assert(typeof f === 'string');
    const filePath = await getFileAbsPath(f);

    // todo limit concurrency?
    if (!ffmpeg.hasFfmpeg()) {
      res.status(500).end();
      return;
    }
    const thumbnail = await ffmpeg.renderThumbnail(filePath);
    res.set('Cache-Control', 'private, max-age=300');
    res.set('Content-Type', 'image/jpeg');
    res.send(Buffer.from(thumbnail));
  }));

  app.get('/api/browse', asyncHandler(async (req, res) => {
    const browseRelPath = req.query['p'] || '/';
    assert(typeof browseRelPath === 'string');
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
        console.warn((err as Error).message);
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
    assert(typeof filesJson === 'string');

    const files = JSON.parse(filesJson) as unknown;
    assert(Array.isArray(files));

    const archive = archiver('zip', { zlib: { level: zipCompressionLevel } });

    res.writeHead(200, {
      'Content-Type': 'application/zip',
      // NOTE: Must support non latin characters
      'Content-Disposition': contentDisposition(zipFileName),
    });

    const promise = stream.pipeline(archive, res);

    await pMap(files, async (file: unknown) => {
      assert(typeof file === 'string');
      const absPath = await getFileAbsPath(file);
      // Add each file to the archive:
      archive.file(absPath, { name: file });
    }, { concurrency: 1 });

    archive.finalize();

    await promise;
  }));

  function getUrls() {
    const interfaces = os.networkInterfaces();
    return Object.values(interfaces).flatMap((addresses) => (addresses != null ? addresses : [])).filter(({ family, address }) => family === 'IPv4' && address !== '127.0.0.1').map(({ address }) => `http://${address}:${port}/`);
  }

  let started = false;

  async function startServer() {
    assert(!started, 'Server already started');
    started = true;

    // Serving the frontend depending on dev/production
    if (devMode) {
      app.use('/', createProxyMiddleware({ target: 'http://localhost:3000', ws: true }));
    } else {
      app.use('/', express.static(webPath));

      // Default to index because SPA
      app.use('*', (_req, res) => res.sendFile(join(webPath, 'index.html')));
    }

    return new Promise<void>((resolve) => {
      app.listen(port, resolve);
    });
  }

  return {
    runStartupCheck: ffmpeg.runStartupCheck,
    getUrls,
    start: startServer,
    sharedPath,
  };
};
