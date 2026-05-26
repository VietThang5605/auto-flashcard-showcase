// --- components/auth/LoginForm.jsx ---
// Form đăng nhập với nút "Sign in with Google" dùng Supabase OAuth.
// Là Client Component vì cần xử lý onClick và state loading.
//
// Flow đăng nhập:
// 1. User click nút → gọi signInWithOAuth → Supabase redirect tới Google
// 2. Google xác thực → redirect về /auth/callback với code
// 3. /auth/callback đổi code lấy session → redirect về /dashboard

"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Sau khi Google xác thực, redirect về callback route
        redirectTo: `${window.location.origin}/auth/callback`,
        // Yêu cầu Google cung cấp thêm thông tin profile
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      setError("Đăng nhập thất bại. Vui lòng thử lại.");
      setIsLoading(false);
    }
    // Nếu thành công, browser sẽ tự redirect → không cần setIsLoading(false)
  };

  return (
    <div className="space-y-4">
      {/* Error message */}
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
          {error}
        </div>
      )}

      {/* Google Sign In Button */}
      <button
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 
          bg-background border-2 border-border hover:border-primary/50 
          rounded-xl font-medium text-foreground
          hover:bg-muted/50 transition-all duration-200
          disabled:opacity-60 disabled:cursor-not-allowed
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {isLoading ? (
          // Loading spinner khi đang xử lý
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        ) : (
          // Google logo SVG
          <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
        )}
        <span>{isLoading ? "Đang đăng nhập..." : "Tiếp tục với Google"}</span>
      </button>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-card px-3 text-muted-foreground">
            Phương thức đăng nhập an toàn
          </span>
        </div>
      </div>

      {/* Feature bullets */}
      <div className="space-y-2">
        {[
          "🔒 Bảo mật với Google OAuth",
          "💾 Lưu flashcard riêng tư cho bạn",
          "📱 Đồng bộ trên mọi thiết bị",
        ].map((item) => (
          <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
