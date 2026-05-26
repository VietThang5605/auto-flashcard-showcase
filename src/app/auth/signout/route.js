// --- auth/signout/route.js ---
// Route Handler để đăng xuất user.
// Dùng POST method để tránh CSRF và accidental logout khi crawl link.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request) {
  const supabase = await createClient();

  // Xóa session từ Supabase và cookies
  await supabase.auth.signOut();

  // Redirect về trang login sau khi đăng xuất
  return NextResponse.redirect(new URL("/login", request.url));
}
