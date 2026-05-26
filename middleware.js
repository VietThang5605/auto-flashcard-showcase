// --- middleware.js ---
// Next.js Middleware chạy trước mọi request.
// Nhiệm vụ:
// 1. Refresh Supabase session cookie (đảm bảo token không hết hạn)
// 2. Bảo vệ các route trong (app) — redirect về /login nếu chưa đăng nhập
// 3. Redirect người đã đăng nhập từ /login về /dashboard

import { NextResponse } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";

export async function middleware(request) {
  const { supabase, supabaseResponse } = createMiddlewareClient(request);

  // QUAN TRỌNG: Phải gọi getUser() để refresh session cookie.
  // Không dùng getSession() vì nó chỉ đọc cookie mà không verify với server.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Danh sách các route public (không cần đăng nhập)
  const publicRoutes = ["/", "/login", "/auth/callback"];
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith("/auth/")
  );

  // Nếu chưa đăng nhập và đang truy cập route protected → redirect về /login
  if (!user && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    // Lưu URL gốc để redirect lại sau khi đăng nhập
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Nếu đã đăng nhập và đang vào /login → redirect về /dashboard
  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Trả về response với cookies đã được refresh
  return supabaseResponse;
}

// Cấu hình matcher: middleware chạy trên mọi route NGOẠI TRỪ:
// - static files (_next/static, _next/image)
// - favicon, robots.txt, manifest.json, sw.js
// - API routes của auth (để tránh loop)
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
