module.exports = {
  extends: ['mifi'],

  overrides: [
    {
      files: ['./frontend/src/**/*.{js,mjs,cjs,mjs,jsx,ts,mts,tsx}'],
      env: {
        node: false,
        browser: true,
      },
    },
  ],
};
