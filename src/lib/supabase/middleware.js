// --- supabase/middleware.js ---
// Supabase client dùng riêng trong middleware.js của Next.js.
// Khác với server.js: middleware dùng request/response trực tiếp,
// không dùng cookies() từ next/headers.
//
// Nhiệm vụ chính: refresh access token tự động trước khi request
// đến Server Component, đảm bảo session không bao giờ expired.

import { createServerClient } from "@supabase/ssr";

/**
 * Tạo Supabase client trong middleware context.
 * Đọc/ghi cookies trực tiếp từ NextRequest/NextResponse.
 *
 * @param {import('next/server').NextRequest} request
 * @returns {{ supabase: SupabaseClient, response: NextResponse }}
 */
import { NextResponse } from "next/server";

export function createMiddlewareClient(request) {
  // Tạo response mới để có thể set cookies vào đó
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Set cookies vào cả request và response
          // Cần thiết để Server Components đọc được session mới nhất
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  return { supabase, supabaseResponse };
}
