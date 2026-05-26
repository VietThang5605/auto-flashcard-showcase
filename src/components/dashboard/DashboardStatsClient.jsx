// --- components/dashboard/DashboardStatsClient.jsx ---
// Component hiển thị thống kê học tập (Client-side fetch để không chặn server render).

"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

export function DashboardStatsClient() {
  const stats = useLiveQuery(async () => {
    try {
      const flashcards = await db.flashcards.filter(f => !f.is_deleted).toArray();
      const totalCards = flashcards.length;
      
      let masteredCount = 0;
      let dueTodayProgress = 0;
      let progressedCardsCount = 0;
      
      const now = new Date().toISOString();

      for (const f of flashcards) {
        if (f.progress) {
          progressedCardsCount++;
          // Tính thẻ Mastered (interval >= 21 ngày theo SM-2)
          if (f.progress.interval >= 21) {
            masteredCount++;
          }
          // Tính thẻ Due Today
          if (f.progress.next_review_date <= now) {
            dueTodayProgress++;
          }
        }
      }
      
      // Số thẻ New chưa bao giờ ôn qua
      const newCardsCount = Math.max(totalCards - progressedCardsCount, 0);

      // Thẻ chờ deal bao gồm thẻ Due và thẻ New
      return {
        masteredCount,
        dueToday: dueTodayProgress + newCardsCount,
        totalCards
      };
    } catch (err) {
      console.error("Lỗi lấy thống kê Dexie:", err);
      return { masteredCount: 0, dueToday: 0, totalCards: 0 };
    }
  }, []);

  const isLoading = stats === undefined;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 rounded-xl bg-muted/20 border border-border/50 text-center animate-pulse h-[100px]">
            <div className="w-12 h-6 bg-muted mx-auto rounded mb-2 mt-1"></div>
            <div className="w-20 h-3 bg-muted mx-auto rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  const statCards = [
    { label: "Đã ghi nhớ", value: stats.masteredCount, color: "text-emerald-500" },
    { label: "Cần ôn tập", value: stats.dueToday, color: stats.dueToday > 0 ? "text-amber-500" : "text-foreground" },
    { label: "Tổng số thẻ", value: stats.totalCards, color: "text-foreground" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {statCards.map((stat, i) => (
        <div 
          key={i} 
          className="p-4 rounded-xl bg-gradient-to-b from-card to-muted/10 border border-border/60 hover:border-primary/30 transition-colors shadow-sm text-center flex flex-col justify-center h-[100px]"
        >
          <p className={`text-3xl font-bold mb-1 font-['var(--font-lora)'] ${stat.color}`}>
            {stat.value}
          </p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  );
}
