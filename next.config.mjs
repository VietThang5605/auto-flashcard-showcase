// --- next.config.mjs ---
// Cấu hình Next.js cho dự án Auto-Flashcard PWA.
// Bao gồm headers bảo mật và cấu hình cho service worker.

import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.js",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development", // Tạm tắt lúc Dev để tránh dính Cache
  exclude: [
    // Loại trừ file MP3 khỏi hệ thống cache tự động để tránh làm phình dung lượng app
    /\.mp3$/, 
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
        ],
      },
    ];
  },
};

export default withSerwist(nextConfig);
