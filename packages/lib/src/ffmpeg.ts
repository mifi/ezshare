import { execa } from 'execa';


export default function Ffmpeg({ ffmpegPath }: { ffmpegPath: string }) {
  let hasFfmpeg = false;

  async function runStartupCheck() {
    try {
      // will throw if exit code != 0
      await execa(ffmpegPath, ['-hide_banner', '-f', 'lavfi', '-i', 'nullsrc=s=256x256:d=1', '-f', 'null', '-']);
      hasFfmpeg = true;
    } catch (err) {
      console.warn('ffmpeg check failed, ffmpeg will not be available', err);
    }
  }

  async function renderThumbnail(filePath: string) {
    const { stdout } = await execa(ffmpegPath, [ // todo stream instead
      // '-ss', String(timestamp),
      '-i', filePath,
      '-vf', 'scale=-2:200',
      '-vframes', '1',
      '-q:v', '10',
      '-c:v', 'mjpeg',
      '-update', '1',
      '-f', 'image2',
      '-',
    ], { encoding: 'buffer' });

    return stdout;
  }

  return {
    runStartupCheck,
    renderThumbnail,
    hasFfmpeg: () => hasFfmpeg,
  };
}
