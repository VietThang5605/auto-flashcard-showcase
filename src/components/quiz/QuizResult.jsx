// --- src/components/quiz/QuizResult.jsx ---
// Giao diện tổng kết sau khi hoàn thành 1 phiên Quiz.

import { useEffect } from "react";
import confetti from "canvas-confetti";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Trophy, Home, RotateCcw } from "lucide-react";

export function QuizResult({ score, correct, wrong, total, onRetry, onHome }) {
  const percentage = Math.round((correct / total) * 100);
  const isPassed = percentage >= 70;

  useEffect(() => {
    if (isPassed) {
      // Chỉ bắn pháo hoa vào lần đầu tiên hoàn thành Quiz trong ngày
      const today = new Date().toISOString().split("T")[0];
      const lastQuizConfettiDate = localStorage.getItem("lastQuizConfettiDate");

      if (lastQuizConfettiDate !== today) {
        // Bắn pháo hoa 🎉 (Số lượng ít hơn trang ôn tập)
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#f43f5e', '#ec4899', '#8b5cf6']
        });
        localStorage.setItem("lastQuizConfettiDate", today);
      }
    }
  }, [isPassed]);

  return (
    <Card className="w-full max-w-xl mx-auto shadow-md border-border text-center overflow-hidden">
      <CardContent className="p-8 sm:p-12 space-y-8 relative">
        {/* Glow background pattern */}
        <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02]" />
        
        <div className="relative z-10 space-y-4">
          <div className="mx-auto w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <Trophy className={`w-12 h-12 ${isPassed ? 'text-yellow-500' : 'text-muted-foreground'}`} />
          </div>

          <h2 className="text-3xl font-bold text-foreground">
            {isPassed ? "Tuyệt vời!" : "Cố gắng lên nhé!"}
          </h2>
          <p className="text-muted-foreground">
            Bạn đã hoàn thành phiên luyện tập trắc nghiệm.
          </p>

          <div className="flex justify-center flex-wrap gap-4 pt-4">
            <div className="bg-background rounded-2xl px-6 py-4 border border-border/50 shadow-sm min-w-32">
              <div className="text-3xl font-bold text-foreground mb-1">{score}</div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Điểm số</div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 pt-4 max-w-xs mx-auto">
            <div className="flex flex-col items-center gap-1">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
              <span className="text-xl font-bold text-foreground">{correct}</span>
              <span className="text-xs text-muted-foreground">Đúng</span>
            </div>
            
            <div className="w-px h-12 bg-border"></div>

            <div className="flex flex-col items-center gap-1">
              <XCircle className="w-8 h-8 text-rose-500" />
              <span className="text-xl font-bold text-foreground">{wrong}</span>
              <span className="text-xs text-muted-foreground">Sai</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row gap-4 justify-center pt-6">
           <Button variant="outline" className="h-12 px-8" onClick={onHome}>
             <Home className="w-4 h-4 mr-2" />
             Trang chủ
           </Button>
           <Button className="h-12 px-8 shadow-md" onClick={onRetry}>
             <RotateCcw className="w-4 h-4 mr-2" />
             Luyện tập tiếp
           </Button>
        </div>

      </CardContent>
    </Card>
  );
}
