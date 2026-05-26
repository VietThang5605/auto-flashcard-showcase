// --- app/(app)/review/page.jsx ---
// Trang chủ của tính năng Ôn tập (Spaced Repetition).
// Giao diện chính để flashcards bật ra và user đánh giá (SM-2).

"use client";

import { useReview } from "@/hooks/useReview";
import { ReviewCard } from "@/components/review/ReviewCard";
import { ReviewComplete } from "@/components/review/ReviewComplete";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ReviewPage() {
  const {
    isLoading,
    queue,
    currentCard,
    isComplete,
    progressPercent,
    submitReview,
    sessionStats,
  } = useReview();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary/50" />
        <p className="text-sm font-medium animate-pulse">Đang tải thẻ ôn tập...</p>
      </div>
    );
  }

  // Handle Complete Stage
  if (isComplete) {
    // Truyền logic reset (nếu muốn tải thêm phiên tiếp theo) làm prop
    return (
      <div className="pt-10">
        <ReviewComplete 
          stats={sessionStats} 
          onReset={() => window.location.reload()} 
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh_-_140px)] min-h-[500px]">
      {/* Header — Nút thoát & Thanh tiến trình */}
      <div className="flex items-center gap-4 mb-8 shrink-0">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground rounded-full hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex justify-between items-end mb-2">
            <h1 className="text-lg font-bold text-foreground">Ôn tập hằng ngày</h1>
            <span className="text-xs font-semibold text-primary">
              {queue.length > 0 ? `${Math.round(progressPercent)}%` : "0%"}
            </span>
          </div>
          <div className="h-2.5 w-full bg-muted/60 rounded-full overflow-hidden border border-border/40">
            <motion.div 
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ ease: "easeInOut", duration: 0.5 }}
            />
          </div>
        </div>
      </div>

      {/* Main Flashcard Stage */}
      <div className="flex-1 flex flex-col items-center justify-center -mt-6">
        <AnimatePresence mode="wait">
          {currentCard && (
            <motion.div
              key={currentCard.id} // Đổi key khiến framer-motion re-render component mới => hiệu ứng slide
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -50, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="w-full"
            >
              <ReviewCard 
                card={currentCard} 
                onEvaluate={submitReview} 
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Info Mờ */}
      <div className="text-center shrink-0 py-6 text-xs text-muted-foreground font-medium opacity-60">
        <p>Thuật toán tự động giãn cách ngày ôn dựa trên kết quả lật thẻ (SM-2).</p>
      </div>
    </div>
  );
}
