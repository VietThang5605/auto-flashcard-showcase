// --- app/layout.jsx ---
// Root layout của toàn bộ ứng dụng.
// Định nghĩa: fonts chung, metadata SEO, ThemeProvider cho dark/light mode,
// và Sonner Toaster cho global notifications.

import { Inter, Lora } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { SyncProvider } from "@/components/providers/SyncProvider";
import "./globals.css";

// Font chính: Inter — clean, modern, widely used trong app design
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Font serif: Lora — dùng riêng cho hiển thị từ vựng để dễ đọc hơn
const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
});

export const metadata = {
  title: {
    default: "Auto Flashcard — Học từ vựng thông minh",
    template: "%s | Auto Flashcard",
  },
  description:
    "Tự động tạo flashcard từ vựng tiếng Anh bằng AI. Ôn tập thông minh với Spaced Repetition. Xây dựng vốn từ vựng hiệu quả mỗi ngày.",
  keywords: ["flashcard", "học tiếng Anh", "spaced repetition", "AI", "từ vựng"],
  manifest: "/manifest.json",
  // Icons: Next.js sẽ tự render thành <link> tag trong <head>
  // apple: dùng cho iOS "Add to Home Screen"
  // icon: favicon hiển thị trên tab browser
  icons: {
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    icon: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  themeColor: [
    // Light mode theme color (màu header browser)
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    // Dark mode theme color
    { media: "(prefers-color-scheme: dark)", color: "#1c1917" },
  ],
  viewport: {
    width: "device-width",
    initialScale: 1,
    // maximumScale: 1 — tắt zoom để có UX nhất quán trên mobile PWA
    maximumScale: 1,
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="vi"
      // suppressHydrationWarning bắt buộc khi dùng next-themes
      // để tránh hydration mismatch giữa server và client
      suppressHydrationWarning
      className={`${inter.variable} ${lora.variable}`}
    >
      <body className="font-sans antialiased">
        {/* ThemeProvider quản lý light/dark mode
            defaultTheme="light": Light mode mặc định theo yêu cầu
            enableSystem: Respect system preference của user
            attribute="class": Thêm class "dark" vào <html> khi dark mode */}
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={true}
          disableTransitionOnChange={false}
        >
          <SyncProvider>
            {children}
          </SyncProvider>

          {/* Global toast notifications — hiển thị ở góc dưới bên phải */}
          <Toaster
            position="bottom-right"
            richColors
            closeButton
            duration={3000}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
