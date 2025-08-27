// eslint-disable-next-line @typescript-eslint/no-var-requires
const { dirname } = require('node:path');


module.exports = {
  packagerConfig: {
    asar: true,
    extraResource: [
      dirname(require.resolve('@ezshare/web/dist/index.html')),
    ],
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'win32', 'linux'],
      config: {},
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-vite',
      config: {
        build: [
          {
            entry: 'src/main.ts',
            config: 'vite.main.config.ts',
            target: 'main',
          },
        ],
        renderer: [
          {
            name: 'main_window',
            config: 'vite.renderer.config.ts',
          },
        ],
      },
    },
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'mifi',
          name: 'ezshare',
        },
      },
    },
  ],
};
