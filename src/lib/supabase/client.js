// --- supabase/client.js ---
// Supabase client cho phía Browser (Client Components).
// Dùng createBrowserClient từ @supabase/ssr để đảm bảo
// session được sync giữa client và server thông qua cookies.
//
// QUAN TRỌNG: Không dùng createClient từ @supabase/supabase-js trực tiếp
// vì nó dùng localStorage, không compatible với Next.js SSR.

import { createBrowserClient } from "@supabase/ssr";

/**
 * Tạo Supabase client cho Browser (Client Components).
 * Gọi hàm này bên trong component hoặc custom hook.
 * Không gọi ở cấp module để tránh re-creation không cần thiết.
 *
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
