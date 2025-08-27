module.exports = {
  extends: ['mifi'],

  overrides: [
    {
      files: ['./packages/web/src/**/*.{js,mjs,cjs,mjs,jsx,ts,mts,tsx}'],
      env: {
        node: false,
        browser: true,
      },
    },
    {
      files: ['./packages/web/src/routes/**/*.{js,mjs,cjs,mjs,jsx,ts,mts,tsx}'],
      rules: {
        'unicorn/filename-case': 'off',
      },
    },
  ],
};
