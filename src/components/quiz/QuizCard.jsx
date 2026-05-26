// --- src/components/quiz/QuizCard.jsx ---
// Component hiển thị khung câu hỏi Trắc nghiệm và 4 đáp án.
// Hỗ trợ đánh dấu sai/đúng và delay trước khi sang câu tiếp theo.

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, ImageIcon, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

export function QuizCard({ question, onAnswer }) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);

  // Reset state khi câu hỏi mới được truyền vào
  useEffect(() => {
    setSelectedOption(null);
    setIsAnswered(false);
  }, [question]);

  // Hàm dọn dẹp các tiền tố do AI hay sinh thừa như "A.", "B)", "Option C"
  // Chỉ xóa nếu có dấu phân cách rõ ràng như dấu chấm hoặc ngoặc đơn (vd: "A. Text")
  const cleanPrefix = (str) => String(str).replace(/^(?:Option\s*)?[A-D][.)]\s*|^Option\s+[A-D]\s*/i, '').trim();

  // Tìm index của đáp án đúng một lần
  const ans = String(question.answer || "").trim();
  const match = ans.match(/^(?:Option\s*)?([A-D])\)?$/i);
  let correctIndex = -1;

  if (match) {
    correctIndex = match[1].toUpperCase().charCodeAt(0) - 65; // A -> 0, B -> 1
  } else {
    const cleanAns = cleanPrefix(ans).toLowerCase();
    correctIndex = question.options.findIndex(opt => {
      const cleanOpt = cleanPrefix(opt).toLowerCase();
      return cleanOpt === cleanAns || (cleanAns.length > 3 && (cleanOpt.includes(cleanAns) || cleanAns.includes(cleanOpt)));
    });
  }

  const handleOptionClick = (option, index) => {
    if (isAnswered) return;

    setSelectedOption(option);
    setIsAnswered(true);

    const isCorrect = index === correctIndex;

    // Đợi 1.2s rồi báo cho parent chuyển câu
    setTimeout(() => {
      onAnswer(isCorrect);
    }, 1200);
  };

  return (
    <Card className="w-full max-w-xl mx-auto shadow-sm border-border/50">
      <CardContent className="p-6 sm:p-8 flex flex-col gap-8">
        
        {/* Câu hỏi */}
        <div className="text-center space-y-4">
          {question.word && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest border border-primary/20">
              <Brain className="w-3 h-3" />
              Context: {question.word}
            </div>
          )}
          
          <div className="relative min-h-[80px] flex items-center justify-center">
            {(() => {
              const text = question.question;
              const parts = text.split(/_{3,}/);

              if (parts.length <= 1 || !isAnswered) {
                return (
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-tight px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {text}
                  </h2>
                );
              }

              const isCorrect = question.options.indexOf(selectedOption) === correctIndex;

              return (
                <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-tight px-4">
                  {parts[0]}
                  <motion.span
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={cn(
                      "mx-2 px-3 py-1 rounded-lg underline decoration-4 underline-offset-8",
                      isCorrect 
                        ? "text-emerald-600 dark:text-emerald-400 decoration-emerald-500/30 bg-emerald-500/5" 
                        : "text-rose-600 dark:text-rose-400 decoration-rose-500/30 bg-rose-500/5 animate-shake"
                    )}
                  >
                    {cleanPrefix(selectedOption)}
                  </motion.span>
                  {parts.slice(1).join("")}
                </h2>
              );
            })()}
          </div>
        </div>

        {/* Các đáp án */}
        <div className="grid grid-cols-1 gap-3">
          {question.options.map((option, idx) => {
            const isSelected = selectedOption === option;
            const isCorrectAnswer = idx === correctIndex;
            
            let btnClass = "justify-start h-auto min-h-14 py-3 px-4 text-left whitespace-normal hover:border-primary/50 text-base font-medium";
            let icon = null;

            if (isAnswered) {
              if (isCorrectAnswer) {
                // Đáp án đúng luôn hiện xanh dù có chọn hay không
                btnClass = cn(btnClass, "bg-green-50 border-green-200 text-green-700 hover:bg-green-50 dark:bg-green-950/40 dark:border-green-900 dark:text-green-300 ring-2 ring-green-500/20");
                icon = <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 ml-auto" />;
              } else if (isSelected && !isCorrectAnswer) {
                // Đáp án sai mà User lỡ chọn thì hiện đỏ + rung lắc
                btnClass = cn(btnClass, "bg-red-50 border-red-200 text-red-700 hover:bg-red-50 dark:bg-red-950/40 dark:border-red-900 dark:text-red-300 animate-shake pointer-events-none ring-2 ring-red-500/20");
                icon = <XCircle className="w-5 h-5 text-red-500 shrink-0 ml-auto" />;
              } else {
                // Đáp án sai khác, mờ đi
                btnClass = cn(btnClass, "opacity-50 grayscale hover:bg-background pointer-events-none");
              }
            }

            return (
              <button
                key={idx}
                disabled={isAnswered}
                onClick={() => handleOptionClick(option, idx)}
                className={cn(
                  "w-full flex items-center justify-between gap-4 px-5 py-4 rounded-2xl border-2 text-left transition-all duration-300",
                  !isAnswered && "border-border/60 hover:border-primary/50 hover:bg-primary/5 bg-background shadow-sm hover:-translate-y-1 active:scale-98",
                  isAnswered && isCorrectAnswer && "bg-emerald-50 border-emerald-500 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-500 dark:text-emerald-300 ring-4 ring-emerald-500/10 scale-[1.02] z-10",
                  isAnswered && isSelected && !isCorrectAnswer && "bg-rose-50 border-rose-500 text-rose-800 dark:bg-rose-950/40 dark:border-rose-500 dark:text-rose-300",
                  isAnswered && !isSelected && !isCorrectAnswer && "opacity-30 grayscale blur-[1px]"
                )}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 transition-colors",
                    !isAnswered && "border-border text-muted-foreground group-hover:border-primary group-hover:text-primary",
                    isAnswered && isCorrectAnswer && "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20",
                    isAnswered && isSelected && !isCorrectAnswer && "bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/20"
                  )}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <div className="flex-1 font-semibold text-base">{cleanPrefix(option)}</div>
                </div>
                {icon}
              </button>
            );
          })}
        </div>

      </CardContent>
    </Card>
  );
}
