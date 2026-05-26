// --- auth/callback/route.js ---
// Route Handler xử lý OAuth callback từ Google/Supabase.
// Sau khi user đăng nhập Google thành công, Supabase redirect về đây
// với một "code" trong query params. Route này:
// 1. Đổi "code" lấy session (access token + refresh token)
// 2. Ghi session vào cookies
// 3. Redirect user về trang đích (dashboard hoặc trang trước khi login)

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);

  // Code do Supabase gửi sau khi Google OAuth thành công
  const code = searchParams.get("code");

  // URL để redirect sau khi đăng nhập (được lưu từ middleware)
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();

    // Đổi authorization code lấy session
    // Đây là bước cuối của OAuth PKCE flow
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Đăng nhập thành công → redirect về trang đích nội bộ.
      const redirectPath = next.startsWith("/") && !next.startsWith("//")
        ? next
        : "/dashboard";
      const redirectUrl = new URL(redirectPath, origin);
      return NextResponse.redirect(redirectUrl);
    }

    // Nếu lỗi đổi code, redirect về login với error message
    console.error("Auth callback error:", error.message);
  }

  // Trường hợp không có code hoặc lỗi → về login với thông báo lỗi
  return NextResponse.redirect(
    new URL("/login?error=auth_callback_failed", origin)
  );
}
