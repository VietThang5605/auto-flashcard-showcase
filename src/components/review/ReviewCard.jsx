// --- components/review/ReviewCard.jsx ---
// Component hiển thị thẻ ôn tập dạng 3D Flip (Framer Motion).
// Mặt trước: Từ vựng
// Mặt sau: Nghĩa, Ví dụ, Âm thanh
// Cung cấp 4 nút feedback dựa trên chất lượng nhớ (SM-2)

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, ChevronDown, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReviewCard({ card, onEvaluate }) {
  const [isFlipped, setIsFlipped] = useState(false);

  // Mỗi khi `card` thay đổi (qua thẻ mới), lật lại mặt trước
  useEffect(() => {
    setIsFlipped(false);
  }, [card?.id]);

  if (!card) return null;

  // Tính thời gian hiển thị dự kiến trên 4 nút chuẩn Anki
  const reps = card.repetitions || 0;
  const oldInterval = card.interval || 0;
  const ef = card.ease_factor || 2.5;

  const btnLabels = {
    again: reps < 2 ? "< 1p" : "10p", // Lapsed card
    hard: reps < 2 ? "6p" : `${Math.max(1, Math.ceil(oldInterval * 1.2))}d`,
    good: reps === 0 ? "10p" : reps === 1 ? "12h" : `${Math.max(1, Math.ceil(oldInterval * ef))}d`,
    easy: reps < 2 ? "4d" : `${Math.max(1, Math.ceil(oldInterval * ef * 1.3))}d`
  };

  const handleFlip = () => {
    if (!isFlipped) setIsFlipped(true);
  };

  const handleScore = (quality) => {
    // 0 = Rất khó (Again)
    // 1 = Khó (Hard)
    // 2 = Dễ (Good)
    // 3 = Rất dễ (Easy)
    onEvaluate(card.id, quality);
  };

  const speak = (e) => {
    e.stopPropagation(); // Ngăn flip thẻ nếu lỡ ấn chạm ở mặt trước
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(card.word);
      utterance.lang = "en-US";
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="relative w-full max-w-lg mx-auto h-[28rem] md:h-[32rem] flip-card-container">
      <div
        className={`w-full h-full relative cursor-pointer flip-card ${isFlipped ? "flipped" : ""}`}
        onClick={handleFlip}
      >
        {/* ===================== FRONT ===================== */}
        <div 
          className="flip-card-front absolute inset-0 bg-card border-2 border-border/60 rounded-3xl p-8 flex flex-col items-center justify-center shadow-lg hover:border-primary/40 transition-colors"
        >
          {/* Badge từ loại & nghĩa ngắn (bản nháp gợi nhớ) */}
          <div className="absolute top-6 flex items-center gap-2">
            {card.word_type && (
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-primary/10 text-primary capitalize">
                {card.word_type}
              </span>
            )}
            {card.isNew && (
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                Từ mới
              </span>
            )}
          </div>

          <button 
            onClick={speak}
            className="w-12 h-12 mb-6 rounded-full bg-muted/60 flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all duration-300 active:scale-95"
            aria-label="Phát âm"
          >
            <Volume2 className="w-6 h-6" />
          </button>

          <h2 className="text-4xl md:text-5xl font-bold text-center text-foreground font-['var(--font-lora)'] break-words">
            {card.word}
          </h2>

          <div className="absolute w-full bottom-6 text-center animate-bounce text-muted-foreground">
            <p className="text-xs font-medium uppercase tracking-widest flex flex-col items-center gap-1 opacity-70">
              Chạm để lật <ChevronDown className="w-4 h-4" />
            </p>
          </div>
        </div>

        {/* ===================== BACK ===================== */}
        <div 
          className="flip-card-back absolute inset-0 bg-card border-2 border-primary/20 rounded-3xl flex flex-col shadow-xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-5 border-b bg-muted/30 relative flex items-start justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-foreground font-['var(--font-lora)'] flex items-baseline gap-3">
                {card.word}
              </h2>
              {card.phonetic && (
                <p className="text-primary font-mono text-sm mt-1.5">{card.phonetic}</p>
              )}
            </div>
            <button 
              onClick={speak}
              className="w-10 h-10 shrink-0 rounded-full bg-background border flex items-center justify-center hover:bg-muted transition-colors"
            >
              <Volume2 className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Body content scrollable */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            {/* Ảnh minh họa — Hiện ở mặt sau ôn tập */}
            {card.image_url && (
              <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border/40 shadow-sm mb-4">
                <img 
                  src={card.image_url} 
                  alt={card.word}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {/* Nhãn nguồn ảnh ở mặt sau */}
                <div className="absolute bottom-1.5 right-1.5 bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded text-[9px] text-white/90 font-medium flex items-center gap-1 capitalize">
                  <ImageIcon className="w-2.5 h-2.5" />
                  {card.image_source || "Photo"}
                </div>
              </div>
            )}

            {/* Nghĩa chính */}
            <div>
              <p className="text-lg font-semibold text-foreground">
                {card.meaning_vi || card.definition_vi}
              </p>
              <p className="text-sm text-muted-foreground italic mt-0.5">
                {card.definition_en}
              </p>
            </div>

            {/* Ví dụ */}
            {card.examples?.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">
                  Ví dụ minh họa
                </p>
                <div className="space-y-3">
                  {card.examples.slice(0, 2).map((ex, i) => (
                    <div key={i} className="bg-primary/5 rounded-lg p-3 border border-primary/10">
                      <p className="text-sm font-medium text-foreground">"{ex.en}"</p>
                      <p className="text-xs text-muted-foreground mt-1">{ex.vi}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Feedback Buttons Footer */}
          {/* Dùng div cover layer bắt click để đảm bảo div to (flip) không chặn sự kiện click bên trong */}
          <div className="p-4 bg-background border-t grid grid-cols-4 gap-2 z-10 relative">
            <button 
              onClick={(e) => { e.stopPropagation(); handleScore(0); }}
              className="flex flex-col items-center p-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60 transition-colors"
            >
              <span className="text-xs font-bold">Rất khó</span>
              <span className="text-[10px] opacity-70">{btnLabels.again}</span>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleScore(1); }}
              className="flex flex-col items-center p-2 rounded-xl bg-orange-100 hover:bg-orange-200 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300 dark:hover:bg-orange-900/60 transition-colors"
            >
              <span className="text-xs font-bold">Khó</span>
              <span className="text-[10px] opacity-70">{btnLabels.hard}</span>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleScore(2); }}
              className="flex flex-col items-center p-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60 transition-colors"
            >
              <span className="text-xs font-bold">Dễ</span>
              <span className="text-[10px] opacity-70">{btnLabels.good}</span>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleScore(3); }}
              className="flex flex-col items-center p-2 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300 dark:hover:bg-sky-900/60 transition-colors"
            >
              <span className="text-xs font-bold">Rất dễ</span>
              <span className="text-[10px] opacity-70">{btnLabels.easy}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
