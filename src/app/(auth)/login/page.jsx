// --- (auth)/login/page.jsx ---
// Trang đăng nhập của ứng dụng.
// Sử dụng Supabase OAuth để đăng nhập bằng Google.
// Giao diện: full-screen với animated gradient, glassmorphism card.

import { LoginForm } from "@/components/auth/LoginForm";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Đăng nhập",
  description: "Đăng nhập vào Auto Flashcard bằng tài khoản Google của bạn.",
};

export default async function LoginPage({ searchParams }) {
  // Nếu user đã đăng nhập → redirect về dashboard
  // Middleware cũng làm việc này nhưng double-check ở đây để tránh flash
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const params = await searchParams;
    redirect(params?.redirectTo || "/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      {/* Background decoration — abstract shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      {/* Login Card */}
      <div className="relative w-full max-w-md">
        <div className="bg-card border shadow-2xl rounded-2xl p-8 space-y-8 animate-slide-up">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/25">
                <span className="text-3xl">🧠</span>
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Auto Flashcard
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Học từ vựng thông minh hơn với AI
              </p>
            </div>
          </div>

          {/* Login Form Component */}
          <LoginForm />

          {/* Footer note */}
          <p className="text-center text-xs text-muted-foreground">
            Bằng cách đăng nhập, bạn đồng ý với{" "}
            <a href="#" className="underline hover:text-foreground transition-colors">
              Điều khoản Dịch vụ
            </a>{" "}
            của chúng tôi.
          </p>
        </div>
      </div>
    </div>
  );
}
