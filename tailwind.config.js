import tailwindcssAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      spacing: {
        safe: 'env(safe-area-inset-bottom)',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
