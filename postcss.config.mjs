// postcss.config.mjs
// Cấu hình PostCSS cho Tailwind CSS v4.
// Tailwind v4 dùng plugin @tailwindcss/postcss thay vì tailwindcss cũ.
// File này bắt buộc để Next.js biết cách xử lý Tailwind classes.

const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
