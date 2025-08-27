// eslint-disable-next-line import/no-extraneous-dependencies
import QRCode from 'qrcode';

import './index.css';

const { ipcRenderer } = window.require('electron');

async function fetchData() {
  const container = document.getElementById('dynamic');
  if (!container) throw new Error('No container found');

  const { urls }: { urls: string[] } = await ipcRenderer.invoke('getData');

  container.replaceChildren();

  await Promise.all(urls.map(async (url) => {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;

    const node = document.createElement('div');
    node.className = 'url';

    const textNode = document.createElement('div');
    textNode.textContent = url;
    textNode.className = 'text';

    node.append(canvas);
    node.append(textNode);
    container.append(node);

    await new Promise<void>((resolve, reject) => QRCode.toCanvas(canvas, url, { margin: 0 }, (error) => {
      if (error) reject(error);
      else resolve();
    }));
  }));
}

document.addEventListener('DOMContentLoaded', fetchData);
