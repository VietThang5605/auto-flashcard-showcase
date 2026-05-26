// --- (app)/layout.jsx ---
// Layout shell cho toàn bộ khu vực app (require auth).
// Cấu trúc responsive:
//   Desktop (≥768px): Sidebar cố định bên trái + main content bên phải
//   Mobile (<768px): Full-width content + Bottom navigation bar
//
// Auth strategy:
// - Middleware đã verify token với Supabase server trước khi request vào đây
// - Layout dùng getSession() thay vì getUser() để CHỈ đọc cookie cục bộ → không round trip
// - getUser() (network call) chỉ cần ở API routes và các thao tác nhạy cảm
// - Nếu session không tồn tại trong cookie → redirect về login

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Sparkles,
  RotateCcw,
  HelpCircle,
  BookOpen,
  Settings,
  LogOut,
} from "lucide-react";

// Danh sách navigation items — dùng chung cho sidebar và bottom nav
const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/create", icon: Sparkles, label: "Tạo thẻ" },
  { href: "/review", icon: RotateCcw, label: "Ôn tập" },
  { href: "/quiz", icon: HelpCircle, label: "Quiz" },
  { href: "/flashcards", icon: BookOpen, label: "Thư viện" },
  { href: "/settings", icon: Settings, label: "Cài đặt" },
];

export default async function AppLayout({ children }) {
  // Dùng getSession() thay vì getUser() để tránh network round trip ra Supabase.
  // Middleware đã gọi getUser() (verify với server) trước khi request đến đây,
  // session cookie đã được refresh nếu cần — chỉ cần đọc local cookie là đủ.
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Nếu không có session → middleware lẽ ra đã redirect nhưng fallback thêm lần nữa
  if (!session) {
    redirect("/login");
  }

  const user = session.user;

  // Lấy tên hiển thị từ Google OAuth metadata (đã có trong session cookie, không cần fetch thêm)
  const displayName =
    user?.user_metadata?.full_name?.split(" ")[0] ||
    user?.user_metadata?.name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "bạn";

  const avatarUrl = user?.user_metadata?.avatar_url;

  return (
    <div className="min-h-screen bg-background flex">
      {/* ===== SIDEBAR — Desktop only (hidden on mobile) ===== */}
      <aside className="hidden md:flex flex-col w-60 border-r border-border bg-card shrink-0 h-screen sticky top-0">
        {/* Logo */}
        <div className="p-5 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground text-sm">Auto Flashcard</span>
          </Link>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground
                hover:text-foreground hover:bg-muted transition-colors duration-150 group"
            >
              <item.icon className="w-4 h-4 shrink-0 group-hover:text-primary transition-colors" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User profile + signout — đáy sidebar */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2 px-3 py-2 mb-1">
            {/* Avatar */}
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-7 h-7 rounded-full border border-border"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm font-medium text-foreground truncate flex-1">
              {displayName}
            </span>
          </div>

          {/* Sign out */}
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground
                hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors duration-150"
            >
              <LogOut className="w-4 h-4" />
              Đăng xuất
            </button>
          </form>
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Mobile header — chỉ hiện trên mobile */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card sticky top-0 z-40">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground text-sm">Auto Flashcard</span>
          </Link>

          {/* Avatar mobile */}
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-8 h-8 rounded-full border border-border"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </header>

        {/* Page content — padding bottom để không bị bottom nav che */}
        <div className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
          {children}
        </div>
      </main>

      {/* ===== BOTTOM NAV — Mobile only ===== */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-card border-t border-border z-50 safe-area-inset-bottom">
        <div className="flex items-center justify-around px-2 py-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg
                text-muted-foreground hover:text-foreground transition-colors duration-150 group"
            >
              <item.icon className="w-5 h-5 group-hover:text-primary transition-colors" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
