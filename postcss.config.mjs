// `base` is pinned to this directory on purpose. An unrelated npm project higher
// up the tree (/Users/avigaba/package.json) makes resolution walk out of the repo
// and fail to find `tailwindcss`, which hangs the dev server.
const config = {
  plugins: {
    "@tailwindcss/postcss": {
      base: import.meta.dirname,
    },
  },
};

export default config;
