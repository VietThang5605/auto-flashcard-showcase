// --- supabase/server.js ---
// Supabase client cho phía Server (Server Components, API Routes, Server Actions).
// Sử dụng cookies() từ next/headers để đọc/ghi session cookie.
//
// QUAN TRỌNG: File này chỉ được import trong Server Components hoặc Route Handlers.
// Không import trong Client Components — sẽ bị lỗi vì next/headers
// không available ở phía client.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Tạo Supabase client cho Server Components và API Routes.
 * Đọc session từ cookie request, tự động refresh token nếu cần.
 *
 * @returns {Promise<import('@supabase/supabase-js').SupabaseClient>}
 */
export async function createClient() {
  // cookies() là async trong Next.js 15
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        // Đọc cookie từ request
        getAll() {
          return cookieStore.getAll();
        },
        // Ghi cookie vào response (chỉ hoạt động trong Server Actions và Route Handlers)
        // Trong Server Components, setAll sẽ throw error — đây là expected behavior
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component không thể set cookies — middleware sẽ xử lý việc refresh
          }
        },
      },
    }
  );
}
