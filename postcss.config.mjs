/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    // Tailwind v4 moved its PostCSS plugin to a separate package (Epic 18).
    "@tailwindcss/postcss": {},
  },
};

export default config;
