// --- app/(app)/create/CreatePageClient.jsx ---
// Client Component cho trang tạo flashcard.
// Tách riêng khỏi page.jsx để page.jsx có thể export metadata (Server Component).
//
// Quản lý toàn bộ state machine:
// - phase: "idle" | "analyzing" | "result" | "saving"
// - flashcardData: kết quả AI trả về (null khi idle/analyzing)
// - provider: AI provider đã dùng để phân tích
//
// Tính năng persistence:
// - Khi phase = "result" và có flashcardData → lưu vào sessionStorage
// - Khi mount → khôi phục state từ sessionStorage nếu có
// - Khi lưu thành công hoặc nhấn "Từ mới" → xóa sessionStorage

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ImageIcon, ImageOff } from "lucide-react";
import { toast } from "sonner";
import { FlashcardForm } from "@/components/flashcard/FlashcardForm";
import { AIAnalyzing } from "@/components/flashcard/AIAnalyzing";
import { FlashcardView } from "@/components/flashcard/FlashcardView";
import { DeckPicker } from "@/components/deck/DeckPicker";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/supabase/client";

// Key dùng để lưu/đọc state từ sessionStorage
// sessionStorage tự mất khi đóng tab — không persist qua session khác
const SESSION_KEY = "create-flashcard-state";

export default function CreatePageClient() {
  // State machine cho luồng tạo flashcard
  const [phase, setPhase] = useState("idle"); // "idle" | "analyzing" | "result" | "saving"
  const [flashcardData, setFlashcardData] = useState(null);
  const [activeProvider, setActiveProvider] = useState("openai");
  const [activeImageProvider, setActiveImageProvider] = useState("unsplash");

  // Deck được chọn để lưu flashcard vào
  const [selectedDeckId, setSelectedDeckId] = useState(null);

  // Tùy chọn lưu kèm ảnh hay không
  const [includeImage, setIncludeImage] = useState(true);

  // Khôi phục state từ sessionStorage khi component mount
  // Điều này giúp user quay lại trang Create mà không mất card đang xem
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const { 
          flashcardData: savedData, 
          activeProvider: savedProvider,
          activeImageProvider: savedImageProvider 
        } = JSON.parse(saved);
        if (savedData) {
          setFlashcardData(savedData);
          setActiveProvider(savedProvider || "openai");
          setActiveImageProvider(savedImageProvider || "unsplash");
          setPhase("result"); // Luôn khôi phục về "result", không bao giờ "saving"
        }
      }
    } catch {
      // Nếu parse lỗi (dữ liệu cũ/hỏng), bỏ qua và giữ state ban đầu
      sessionStorage.removeItem(SESSION_KEY);
    }
  }, []);

  // Cập nhật sessionStorage mỗi khi state "result" có flashcardData
  // Dùng useEffect riêng để đảm bảo luôn lưu state mới nhất
  useEffect(() => {
    if (phase === "result" && flashcardData) {
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({
          flashcardData,
          activeProvider,
          activeImageProvider,
        }));
      } catch {
        // Bỏ qua lỗi storage (ví dụ: private mode limit đã đầy)
      }
    }
  }, [phase, flashcardData, activeProvider]);

  /**
   * Handler khi FlashcardForm submit thành công — nhận data từ AI.
   * Provider được truyền trực tiếp để tránh stale state.
   */
  const handleFormAnalyze = (data, formProvider, imageSource) => {
    setActiveProvider(formProvider || activeProvider);
    // Gắn thêm image_source vào data để các component con dễ truy cập
    setFlashcardData({ ...data, image_source: imageSource });
    setPhase("result");
  };

  /**
   * Khi form bắt đầu gọi API — chuyển sang phase analyzing để hiện skeleton.
   */
  const handleAnalyzingStart = (provider) => {
    setActiveProvider(provider);
    setPhase("analyzing");
  };

  /**
   * Khi phân tích thất bại — quay về idle để user thử lại.
   */
  const handleAnalyzeError = () => {
    setPhase("idle");
  };

  /**
   * Lưu flashcard vào Supabase database.
   * Mapping: AI response (camelCase) → database columns (snake_case).
   * Lưu thêm: word_type, meaning_vi (fields mới), deck_id.
   */
  const handleSave = async (data) => {
    setPhase("saving");

    try {
      const supabase = createClient();

      // Lấy user ID từ session
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        setPhase("result");
        return;
      }

      // Import động syncService để tránh gọi server logic quá sớm ở client
      const { syncService } = await import("@/lib/syncService");
      
      const cardData = {
        word: data.word,
        phonetic: data.phonetic || null,
        word_type: data.word_type || null,
        meaning_vi: data.meaning_vi || null,
        definition_en: data.definition_en,
        definition_vi: data.definition_vi,
        explanation_en: data.explanation_en || null,
        explanation_vi: data.explanation_vi || null,
        examples: data.examples || [],
        synonyms: data.synonyms || [],
        antonyms: data.antonyms || [],
        related_words: data.related_words || [],
        quiz_questions: data.quiz_questions || [],
        ai_provider: activeProvider,
        deck_id: selectedDeckId || null,
        image_url: includeImage ? (data.image_url || null) : null,
        image_source: includeImage ? (data.image_source || null) : null,
        is_bookmarked: false,
      };

      try {
        await syncService.saveNewCard(supabase, user.id, cardData);
      } catch (error) {
        // Lỗi duplicate (unique constraint) — từ đã tồn tại trong db của user này
        if (error.code === "23505") {
          toast.error(`Từ "${data.word}" đã có trong thư viện của bạn rồi!`);
        } else {
          console.error("[CreatePage] Supabase insert error:", error);
          toast.error(`Lưu thất bại: ${error.message || "Vui lòng kiểm tra lại thiết lập Database"}`);
        }
        setPhase("result");
        return;
      }

      // Lưu thành công → xóa sessionStorage + reset về idle
      toast.success(`Đã lưu flashcard "${data.word}" ✓`, {
        description: "Từ mới đã được thêm vào thư viện của bạn",
        duration: 3000,
      });

      // Xóa state đã lưu vì đã lưu thành công
      sessionStorage.removeItem(SESSION_KEY);

      // Delay nhỏ để user thấy toast trước khi form reset
      setTimeout(() => {
        setFlashcardData(null);
        setSelectedDeckId(null);
        setPhase("idle");
      }, 400);
    } catch (err) {
      console.error("[CreatePage] Unexpected error saving flashcard:", err);
      toast.error("Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.");
      setPhase("result");
    }
  };

  /**
   * Reset về idle để phân tích từ mới.
   * Xóa sessionStorage trước khi reset để state không bị khôi phục lần sau.
   */
  const handleReset = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setFlashcardData(null);
    setSelectedDeckId(null);
    setPhase("idle");
  };

  return (
    <div className="min-h-full">
      {/* ===== PAGE HEADER ===== */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Tạo flashcard mới</h1>
        </div>
        <p className="text-sm text-muted-foreground ml-10">
          Nhập từ vựng — AI sẽ phân tích và tạo flashcard đầy đủ cho bạn
        </p>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {phase === "idle" && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <FlashcardForm
                onAnalyze={handleFormAnalyze}
                onAnalyzingStart={handleAnalyzingStart}
                onAnalyzeError={handleAnalyzeError}
                isLoading={false}
                initialImageProvider={activeImageProvider}
              />
              <TipsSection />
            </motion.div>
          )}

          {phase === "analyzing" && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <AIAnalyzing provider={activeProvider} />
            </motion.div>
          )}

          {(phase === "result" || phase === "saving") && flashcardData && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Lựa chọn lưu: Deck + Hình ảnh */}
              <div className="flex flex-wrap gap-4 items-end justify-between p-4 rounded-xl bg-muted/30 border border-border/50">
                {/* DeckPicker — chọn deck trước khi lưu */}
                <div className="space-y-1.5 flex-1 min-w-[240px]">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Lưu vào deck (tuỳ chọn)
                  </label>
                  <DeckPicker
                    value={selectedDeckId}
                    onValueChange={setSelectedDeckId}
                    disabled={phase === "saving"}
                  />
                </div>

                {/* Toggle Image */}
                <div className="flex items-center gap-3 bg-background/50 px-3 py-2.5 rounded-lg border border-border/50 h-[40px]">
                  <div className={`p-1 rounded ${includeImage ? 'text-primary' : 'text-muted-foreground'}`}>
                    {includeImage ? <ImageIcon className="w-4 h-4" /> : <ImageOff className="w-4 h-4" />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground leading-none">Hình ảnh</span>
                    <span className="text-xs font-medium">{includeImage ? "Đang bật" : "Đã tắt"}</span>
                  </div>
                  <Switch
                    checked={includeImage}
                    onCheckedChange={setIncludeImage}
                    disabled={phase === "saving"}
                  />
                </div>
              </div>

              <FlashcardView
                data={flashcardData}
                provider={activeProvider}
                onSave={handleSave}
                onReset={handleReset}
                isSaving={phase === "saving"}
                hideImage={!includeImage}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/**
 * Section tips — chỉ hiện ở idle state để không làm lộn xộn khi có card.
 */
function TipsSection() {
  return (
    <div className="mt-8 p-4 rounded-xl bg-muted/40 border border-border/50 space-y-2">
      <p className="text-xs font-bold text-foreground/80 uppercase tracking-wide">
        💡 Mẹo sử dụng
      </p>
      <ul className="space-y-1.5">
        {[
          'Nhập đúng từ bạn muốn học — VD: "overwhelmed", "take a toll on", "serendipity"',
          "Thêm câu ví dụ để AI hiểu đúng nghĩa khi từ có nhiều nghĩa khác nhau",
          "Kéo thả thẻ vào Deck ở trang Thư viện để sắp xếp sau khi lưu",
        ].map((tip, i) => (
          <li key={i} className="text-xs text-foreground/80 flex items-start gap-1.5">
            <span className="text-primary mt-0.5 font-bold">→</span>
            {tip}
          </li>
        ))}
      </ul>
    </div>
  );
}
