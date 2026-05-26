// --- src/app/(app)/quiz/page.jsx ---
// Trang chính cho chế độ Quiz Mode.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuiz } from "@/hooks/useQuiz";
import { QuizCard } from "@/components/quiz/QuizCard";
import { QuizProgress } from "@/components/quiz/QuizProgress";
import { QuizResult } from "@/components/quiz/QuizResult";
import { DeckPicker } from "@/components/deck/DeckPicker";
import { Button } from "@/components/ui/button";
import { Loader2, Play, BrainCircuit } from "lucide-react";

export default function QuizPage() {
  const router = useRouter();
  const {
    questions,
    isLoading,
    isReady,
    currentIndex,
    isFinished,
    score,
    correctCount,
    wrongCount,
    currentStreak,
    startQuiz,
    answerQuestion,
    currentQuestion
  } = useQuiz();

  const [selectedDeck, setSelectedDeck] = useState(null);

  // Có thể tự động load khi vào trang
  useEffect(() => {
    // Để cho người dùng tự bấm "Bắt đầu", 
    // hoặc có thể gọi startQuiz() thẳng ở đây.
    // Hiện tại làm màn hình Intro chờ người dùng nhấn.
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Đang chuẩn bị bộ câu hỏi...</p>
      </div>
    );
  }

  // Nếu đã tải xong nhưng hết câu hỏi
  if (isFinished) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
         <QuizResult 
            score={score} 
            correct={correctCount} 
            wrong={wrongCount} 
            total={questions.length} 
            onRetry={() => startQuiz(selectedDeck)}
            onHome={() => router.push("/dashboard")}
         />
      </div>
    );
  }

  // Nếu đang làm bài
  if (isReady && currentQuestion) {
    return (
      <div className="max-w-3xl mx-auto py-6 px-4">
         <QuizProgress 
            currentIndex={currentIndex} 
            total={questions.length} 
            score={score} 
            streak={currentStreak} 
         />
         <QuizCard 
            question={currentQuestion} 
            onAnswer={answerQuestion} 
         />
      </div>
    );
  }

  // Màn hình Intro (chưa bắt đầu)
  return (
    <div className="max-w-3xl mx-auto py-12 px-4 flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
        <BrainCircuit className="w-10 h-10 text-primary" />
      </div>
      
      <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
        Tự Luyện Trắc Nghiệm
      </h1>
      
      <p className="text-muted-foreground max-w-lg mb-8 leading-relaxed">
        Hệ thống sẽ lấy ngẫu nhiên {questions?.length > 0 ? "" : "10"} câu hỏi đa lựa chọn từ thư mục bạn chọn. 
        Hãy cố gắng đạt chuỗi Combo dài nhất để nhận được điểm số cao!
      </p>

      {/* Deck Selector */}
      <div className="w-full max-w-sm mb-8 text-left">
        <label className="block text-sm font-medium text-muted-foreground mb-2 px-1">
          Lọc theo thư mục (Tuỳ chọn)
        </label>
        <DeckPicker 
          value={selectedDeck} 
          onValueChange={setSelectedDeck} 
        />
        <p className="text-xs text-muted-foreground mt-2 px-1 text-center">
          Nếu chọn thư mục, hệ thống sẽ lấy thẻ trong thư mục đó và tất cả thư mục con bên trong.
        </p>
      </div>

      <Button onClick={() => startQuiz(selectedDeck)} size="lg" className="h-14 px-8 text-lg rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform">
        <Play className="w-5 h-5 mr-2 fill-current" />
        Bắt đầu thi
      </Button>
    </div>
  );
}
