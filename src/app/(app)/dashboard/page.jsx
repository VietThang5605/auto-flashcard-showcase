// --- (app)/dashboard/page.jsx ---
// Dashboard "Mission Control" — trang chủ sau khi đăng nhập.
//
// Trang này không gọi Supabase/network — layout đã xử lý auth.
// Render hoàn toàn tĩnh → hiển thị ngay lập tức, không delay.
// Nếu cần data (stats, progress), sẽ fetch client-side với Suspense/loading state.

import Link from "next/link";
import { DashboardStatsClient } from "@/components/dashboard/DashboardStatsClient";

export const metadata = {
  title: "Dashboard | Auto-Flashcard",
};

// Các quick action card — static, không cần fetch
const QUICK_ACTIONS = [
  {
    href: "/create",
    icon: "✨",
    label: "Tạo Flashcard",
    desc: "Thêm từ mới bằng AI",
    color: "from-violet-500/10 to-purple-500/5 border-violet-200 dark:border-violet-900/50",
    iconBg: "bg-violet-100 dark:bg-violet-900/30",
  },
  {
    href: "/review",
    icon: "🔁",
    label: "Ôn Tập",
    desc: "Spaced repetition",
    color: "from-blue-500/10 to-cyan-500/5 border-blue-200 dark:border-blue-900/50",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
  },
  {
    href: "/quiz",
    icon: "🎯",
    label: "Quiz",
    desc: "Kiểm tra kiến thức",
    color: "from-emerald-500/10 to-green-500/5 border-emerald-200 dark:border-emerald-900/50",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  {
    href: "/flashcards",
    icon: "📚",
    label: "Thư viện",
    desc: "Quản lý flashcard",
    color: "from-amber-500/10 to-orange-500/5 border-amber-200 dark:border-amber-900/50",
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
  },
];

export default function DashboardPage() {
  // Không có async, không có Supabase call — render ngay lập tức
  return (
    <div className="space-y-8">
      {/* ===== WELCOME BANNER ===== */}
      <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-7 space-y-3 relative overflow-hidden">
        {/* Decoration blur */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />

        <div className="text-4xl">👋</div>
        <div>
          <h1 className="text-2xl font-bold">Xin chào, chào mừng trở lại!</h1>
          <p className="mt-1 opacity-80 text-sm">
            Tiếp tục hành trình học từ vựng của bạn hôm nay.
          </p>
        </div>
      </div>

      {/* ===== QUICK ACTIONS ===== */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          Bắt đầu nhanh
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`p-4 rounded-xl bg-gradient-to-br border hover:shadow-md transition-all duration-200 space-y-3 group ${item.color}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${item.iconBg} group-hover:scale-110 transition-transform duration-200`}>
                {item.icon}
              </div>
              <div>
                <div className="font-semibold text-foreground text-sm">{item.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ===== STATS CLIENT COMPONENT ===== */}
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 -mt-2">
        Thống kê cá nhân
      </h2>
      <DashboardStatsClient />
    </div>
  );
}
