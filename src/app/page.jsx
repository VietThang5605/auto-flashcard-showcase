// --- app/page.jsx ---
// Landing page (route "/").
// Người dùng chưa đăng nhập sẽ thấy trang giới thiệu ứng dụng.
// Middleware tự động redirect user đã đăng nhập → /dashboard.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function LandingPage() {
  // Kiểm tra session phía server — nếu đã đăng nhập thì redirect ngay
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex flex-col items-center justify-center p-6">
      {/* Hero Section */}
      <div className="max-w-2xl mx-auto text-center space-y-8 animate-slide-up">
        {/* Logo / Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-2xl bg-white border border-border/50 flex items-center justify-center shadow-sm">
            <span className="text-4xl">🧠</span>
          </div>
        </div>

        {/* Tagline */}
        <div className="space-y-4">
          <h1 className="text-5xl font-bold tracking-tight text-foreground">
            Học từ vựng{" "}
            <span className="text-primary">thông minh hơn</span>
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            AI tự động tạo flashcard. Spaced Repetition nhắc nhở đúng lúc.
            <br />
            Xây dựng vốn từ vựng tiếng Anh hiệu quả mỗi ngày.
          </p>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          {[
            { icon: "🤖", label: "AI phân tích" },
            { icon: "🔁", label: "Spaced Repetition" },
            { icon: "📱", label: "PWA Mobile" },
          ].map((feature) => (
            <div
              key={feature.label}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border shadow-sm"
            >
              <span className="text-2xl">{feature.icon}</span>
              <span className="font-medium text-foreground">{feature.label}</span>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity shadow-lg shadow-primary/25"
        >
          Bắt đầu miễn phí
          <span>→</span>
        </Link>

        <p className="text-sm text-muted-foreground">
          Đăng nhập bằng Google — không cần tạo tài khoản mới
        </p>
      </div>
    </main>
  );
}
