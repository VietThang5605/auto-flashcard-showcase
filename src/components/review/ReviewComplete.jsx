// --- components/review/ReviewComplete.jsx ---
// Component hiển thị khi người dùng hoàn thành tất cả thẻ trong Session học.

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Award, CheckCircle2, ArrowLeft, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReviewComplete({ stats, onReset }) {
  const router = useRouter();

  useEffect(() => {
    // Chỉ bắn pháo hoa vào lần đầu tiên hoàn thành trong ngày
    const today = new Date().toISOString().split("T")[0];
    const lastConfettiDate = localStorage.getItem("lastConfettiDate");

    if (lastConfettiDate !== today) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#10b981', '#f59e0b', '#e85d4a']
      });
      localStorage.setItem("lastConfettiDate", today);
    }
  }, []);

  // Tính accuracy
  const total = stats.reviewedCount;
  const accuracy = total > 0 ? Math.round((stats.correctCount / total) * 100) : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="max-w-md mx-auto relative z-10"
    >
      <div className="bg-card border-2 border-border/50 rounded-3xl p-8 text-center shadow-xl space-y-6">
        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <Award className="w-10 h-10" />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Chúc mừng! 🎉</h2>
          <p className="text-muted-foreground text-sm">
            Bạn đã hoàn thành mục tiêu ôn tập hiện tại.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-muted/50 border border-border/40">
            <p className="text-3xl font-bold text-foreground mb-1">{total}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Tử đã ôn</p>
          </div>
          <div className="p-4 rounded-2xl bg-muted/50 border border-border/40">
            <p className="text-3xl font-bold text-emerald-500 mb-1">{accuracy}%</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Độ chính xác</p>
          </div>
        </div>

        <div className="pt-2 flex flex-col gap-3">
          <Button 
            className="w-full h-12 text-md rounded-xl"
            onClick={() => router.push("/dashboard")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Về trang chủ Dashboard
          </Button>
          <Button 
            variant="outline" 
            className="w-full h-12 rounded-xl"
            onClick={onReset}
          >
            <RotateCw className="w-4 h-4 mr-2" />
            Kiểm tra thêm thẻ mới
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
