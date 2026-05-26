// --- components/flashcard/FlashcardView.jsx ---
// Component hiển thị toàn bộ kết quả AI phân tích từ vựng.
// Layout: word header → tabs (Definition / Examples / Quiz) → action buttons.
//
// Props:
// - data: FlashcardData — object trả về từ /api/analyze
// - provider: "openai" | "gemini" — AI provider đã dùng để phân tích
// - onSave: (data: FlashcardData) => void — callback khi user nhấn "Lưu"
// - onReset: () => void — callback khi user nhấn "Phân tích từ mới"
// - isSaving: boolean — trạng thái đang lưu vào database
// - hideImage: boolean — ẩn phần hình ảnh (khi user chọn không lưu ảnh)

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Volume2,
  VolumeX,
  BookOpen,
  Lightbulb,
  HelpCircle,
  Save,
  RotateCcw,
  Check,
  ChevronRight,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { speak, stopSpeaking, isTTSSupported } from "@/lib/tts";

// Animation variants cho các phần tử con xuất hiện lần lượt (stagger)
const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

export function FlashcardView({ data, provider = "openai", onSave, onReset, isSaving = false, isViewOnly = false, onClose, hideImage = false }) {
  // Trạng thái TTS — biết button nào đang phát để hiển thị icon tương ứng
  const [speakingId, setSpeakingId] = useState(null);
  const ttsSupported = isTTSSupported();

  /**
   * Phát âm một đoạn text.
   * id: string duy nhất để biết button nào đang active.
   * rate: chậm hơn (0.8) cho từ đơn, bình thường (0.9) cho câu.
   */
  const handleSpeak = (text, id, rate = 0.9) => {
    if (speakingId === id) {
      // Đang phát → dừng lại
      stopSpeaking();
      setSpeakingId(null);
      return;
    }

    speak(text, {
      rate,
      onStart: () => setSpeakingId(id),
      onEnd: () => setSpeakingId(null),
    });
  };

  // Màu badge cho word_type
  const wordTypeBadgeColor = {
    noun: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    verb: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    adjective: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    adverb: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    phrase: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  };
  const wordTypeClass =
    wordTypeBadgeColor[data.word_type?.toLowerCase()] ||
    "bg-muted text-muted-foreground";

  return (
    <motion.div
      className="w-full space-y-5"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ===== HEADER: Từ + phonetic + nút phát âm ===== */}
      <motion.div variants={itemVariants} className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Từ vựng — dùng font Lora serif */}
            <h2 className="text-3xl font-bold text-foreground font-['var(--font-lora)'] leading-tight">
              {data.word}
            </h2>

            {/* Badge loại từ */}
            {data.word_type && (
              <span
                className={`px-2 py-0.5 rounded-md text-xs font-medium capitalize ${wordTypeClass}`}
              >
                {data.word_type}
              </span>
            )}
          </div>

          {/* Phiên âm IPA */}
          {data.phonetic && (
            <p className="text-muted-foreground text-sm mt-1 font-mono">{data.phonetic}</p>
          )}

          {/* Nghĩa tiếng Việt ngắn — hiện nhanh dưới phonetic, không cần vào tab Định nghĩa */}
          {data.meaning_vi && (
            <p className="text-sm mt-1 font-semibold text-primary/80">
              {data.meaning_vi}
            </p>
          )}
        </div>

        {/* Nút phát âm từ — hiển thị sound wave khi đang phát */}
        {ttsSupported && (
          <button
            onClick={() => handleSpeak(data.word, "word", 0.8)}
            className={`flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center
              transition-all duration-200 hover:scale-110 active:scale-95
              ${
                speakingId === "word"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:border-primary hover:text-primary"
              }`}
            title="Phát âm"
          >
            {speakingId === "word" ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
        )}
      </motion.div>

      {/* ===== TABS: Định nghĩa / Ví dụ / Quiz ===== */}
      <motion.div variants={itemVariants}>
        <Tabs defaultValue="definition" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="definition" className="flex items-center gap-1.5 text-xs">
              <BookOpen className="w-3.5 h-3.5" />
              Định nghĩa
            </TabsTrigger>
            <TabsTrigger value="examples" className="flex items-center gap-1.5 text-xs">
              <Lightbulb className="w-3.5 h-3.5" />
              Ví dụ
            </TabsTrigger>
            <TabsTrigger value="quiz" className="flex items-center gap-1.5 text-xs">
              <HelpCircle className="w-3.5 h-3.5" />
              Quiz
            </TabsTrigger>
          </TabsList>

          {/* ---- Tab 1: Định nghĩa ---- */}
          <TabsContent value="definition" className="space-y-4 mt-0">
            {/* Ảnh minh họa — Hiển thị ngay trên cùng tab định nghĩa */}
            {!hideImage && data.image_url && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border/50 shadow-inner group"
              >
                <img 
                  src={data.image_url} 
                  alt={data.word}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                <div className="absolute bottom-2 right-2 bg-black/40 backdrop-blur-md px-2 py-1 rounded text-[10px] text-white font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity capitalize">
                  <ImageIcon className="w-3 h-3" />
                  {data.image_source || "Unsplash"}
                </div>
              </motion.div>
            )}

            {/* Definitions */}
            <div className="space-y-3">
              {/* Tiếng Anh */}
              <div className="p-4 rounded-xl bg-muted/50 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Tiếng Anh
                </p>
                <p className="text-sm font-medium text-foreground leading-relaxed">
                  {data.definition_en}
                </p>
              </div>

              {/* Tiếng Việt */}
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-1">
                <p className="text-xs font-semibold text-primary/70 uppercase tracking-wide">
                  Tiếng Việt
                </p>
                <p className="text-sm font-medium text-foreground leading-relaxed">
                  {data.definition_vi}
                </p>
              </div>
            </div>

            {/* Explanation chi tiết */}
            {(data.explanation_en || data.explanation_vi) && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Giải thích chi tiết
                </p>
                {data.explanation_vi && (
                  <p className="text-sm text-foreground leading-relaxed">{data.explanation_vi}</p>
                )}
                {data.explanation_en && (
                  <p className="text-sm text-muted-foreground leading-relaxed italic">
                    {data.explanation_en}
                  </p>
                )}
              </div>
            )}

            {/* Synonyms / Antonyms / Related */}
            <div className="space-y-3">
              {data.synonyms?.length > 0 && (
                <WordGroup label="Từ đồng nghĩa" words={data.synonyms} color="emerald" />
              )}
              {data.antonyms?.length > 0 && (
                <WordGroup label="Từ trái nghĩa" words={data.antonyms} color="rose" />
              )}
              {data.related_words?.length > 0 && (
                <WordGroup label="Từ liên quan" words={data.related_words} color="violet" />
              )}
            </div>
          </TabsContent>

          {/* ---- Tab 2: Ví dụ ---- */}
          <TabsContent value="examples" className="mt-0">
            {data.examples?.length > 0 ? (
              <div className="space-y-3">
                {data.examples.map((ex, idx) => (
                  <ExampleCard
                    key={idx}
                    index={idx}
                    example={ex}
                    speakingId={speakingId}
                    onSpeak={handleSpeak}
                    ttsSupported={ttsSupported}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Không có câu ví dụ
              </p>
            )}
          </TabsContent>

          {/* ---- Tab 3: Quiz ---- */}
          <TabsContent value="quiz" className="mt-0">
            {data.quiz_questions?.length > 0 ? (
              <div className="space-y-4">
                {data.quiz_questions.map((q, idx) => (
                  <QuizQuestionCard key={idx} question={q} index={idx} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Không có câu hỏi quiz
              </p>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* ===== ACTION BUTTONS: Lưu / Phân tích từ mới / Đóng ===== */}
      <motion.div variants={itemVariants} className="flex gap-3 pt-1">
        {isViewOnly ? (
          <Button
            onClick={onClose}
            className="w-full h-11 font-medium bg-muted hover:bg-muted/80 text-foreground"
          >
            Đóng
          </Button>
        ) : (
          <>
            {/* Nút lưu flashcard */}
            <Button
              onClick={() => onSave(data)}
              disabled={isSaving}
              className="flex-1 h-11 gap-2 bg-primary hover:bg-primary/90"
              id="save-flashcard-btn"
            >
              {isSaving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Lưu flashcard
                </>
              )}
            </Button>

            {/* Nút phân tích từ mới */}
            <Button
              onClick={onReset}
              variant="outline"
              className="h-11 gap-2"
              disabled={isSaving}
              id="reset-flashcard-btn"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:block">Từ mới</span>
            </Button>
          </>
        )}
      </motion.div>

      {/* Provider badge — cho biết AI nào đã tạo flashcard này */}
      <motion.div variants={itemVariants} className="flex justify-center">
        <span className="text-xs text-muted-foreground/60 flex items-center gap-1">
          Được phân tích bởi{" "}
          <span className="font-medium text-muted-foreground">
            {provider === "openai" ? "🤖 OpenAI GPT-4o" : "✨ Gemini Flash"}
          </span>
        </span>
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// Sub-components (private, chỉ dùng trong file này)
// ============================================================

/**
 * Nhóm hiển thị synonyms / antonyms / related_words dạng badges.
 * color: "emerald" | "rose" | "violet" — màu sắc badge tương ứng loại từ.
 */
function WordGroup({ label, words, color }) {
  const colorMap = {
    emerald:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-500/20",
    rose: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300 border border-rose-200/50 dark:border-rose-500/20",
    violet:
      "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300 border border-violet-200/50 dark:border-violet-500/20",
  };

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {words.map((word, i) => (
          <span
            key={i}
            className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${colorMap[color]}`}
          >
            {word}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Thẻ hiển thị một câu ví dụ (EN + VI) với nút phát âm.
 * Index dùng để tạo speakingId duy nhất tránh conflict.
 */
function ExampleCard({ index, example, speakingId, onSpeak, ttsSupported }) {
  const speakId = `example-${index}`;
  const isActive = speakingId === speakId;

  return (
    <Card className="border-border/60">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start gap-2">
          {/* Số thứ tự */}
          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
            {index + 1}
          </span>

          <div className="flex-1 min-w-0 space-y-1">
            {/* Câu tiếng Anh + nút phát âm */}
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-foreground leading-relaxed">
                {example.en}
              </p>
              {ttsSupported && (
                <button
                  onClick={() => onSpeak(example.en, speakId, 0.85)}
                  className={`flex-shrink-0 w-7 h-7 rounded-full border flex items-center justify-center
                    transition-colors duration-150
                    ${
                      isActive
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                    }`}
                  title="Phát âm câu ví dụ"
                >
                  {isActive ? (
                    <VolumeX className="w-3 h-3" />
                  ) : (
                    <Volume2 className="w-3 h-3" />
                  )}
                </button>
              )}
            </div>

            {/* Dịch tiếng Việt */}
            <p className="text-xs text-muted-foreground leading-relaxed">
              <ChevronRight className="w-3 h-3 inline-block mr-0.5 opacity-60" />
              {example.vi}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuizQuestionCard({ question, index }) {
  // Thay vì lưu string, ta lưu index của đáp án được chọn cho chuẩn xác
  const [selectedIndex, setSelectedIndex] = useState(null);
  const isAnswered = selectedIndex !== null;

  // Hàm dọn dẹp các tiền tố do AI hay sinh thừa như "A.", "B)", "Option C"
  // Chỉ xóa nếu có dấu phân cách rõ ràng như dấu chấm hoặc ngoặc đơn để tránh xóa nhầm chữ cái đầu của từ (vd: "All" -> "ll")
  const cleanPrefix = (str) => String(str).replace(/^(?:Option\s*)?[A-D][.)]\s*|^Option\s+[A-D]\s*/i, '').trim();

  // Tìm index của đáp án đúng một lần
  const ans = String(question.answer || "").trim();
  const match = ans.match(/^(?:Option\s*)?([A-D])\)?$/i);
  let correctIndex = -1;

  if (match) {
    correctIndex = match[1].toUpperCase().charCodeAt(0) - 65; // A -> 0, B -> 1
  } else if (question.options) {
    const cleanAns = cleanPrefix(ans).toLowerCase();
    correctIndex = question.options.findIndex(opt => {
      const cleanOpt = cleanPrefix(opt).toLowerCase();
      return cleanOpt === cleanAns || (cleanAns.length > 3 && (cleanOpt.includes(cleanAns) || cleanAns.includes(cleanOpt)));
    });
  }

  const isCorrect = selectedIndex === correctIndex;

  // Cấu trúc lại câu hỏi để có phần interactive blank
  const renderQuestion = () => {
    const text = question.question;
    const parts = text.split(/_{3,}/); // Cắt chuỗi tại chỗ có ít nhất 3 dấu gạch dưới

    if (parts.length <= 1 || !isAnswered) {
      return (
        <p className="text-sm font-medium text-foreground leading-relaxed">
          {text}
        </p>
      );
    }

    const selectedText = cleanPrefix(question.options[selectedIndex]);

    return (
      <p className="text-sm font-medium text-foreground leading-relaxed">
        {parts[0]}
        <motion.span 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`mx-1 px-1.5 py-0.5 rounded font-bold underline decoration-2 underline-offset-4 ${
            isCorrect ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
          }`}
        >
          {selectedText}
        </motion.span>
        {parts.slice(1).join("")}
      </p>
    );
  };

  return (
    <Card className="border-border/60 overflow-hidden shadow-sm">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-2">
          <span className="flex-shrink-0 text-[10px] font-bold text-primary/50 bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10 mt-0.5">
            Q{index + 1}
          </span>
          {renderQuestion()}
        </div>

        {/* Options */}
        {question.options && (
          <div className="grid grid-cols-1 gap-2">
            {question.options.map((opt, i) => {
              const isSelected = selectedIndex === i;
              const isCorrectOpt = i === correctIndex;
              const displayText = cleanPrefix(opt);

              let optClass = "w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all duration-200 border-2 ";

              if (!isAnswered) {
                optClass += "border-border/40 hover:border-primary/40 hover:bg-primary/5 text-foreground shadow-sm hover:translate-x-1";
              } else if (isCorrectOpt) {
                optClass += "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200 ring-2 ring-emerald-500/20";
              } else if (isSelected && !isCorrectOpt) {
                optClass += "border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-200 animate-shake";
              } else {
                optClass += "border-border/20 text-muted-foreground opacity-50 grayscale";
              }

              return (
                <button
                  key={i}
                  onClick={() => !isAnswered && setSelectedIndex(i)}
                  className={optClass}
                  disabled={isAnswered}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                      !isAnswered ? "border-border" : isCorrectOpt ? "border-emerald-500 bg-emerald-500 text-white" : "border-border"
                    }`}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1 font-medium">{displayText}</span>
                    {isAnswered && isCorrectOpt && <Check className="w-4 h-4 text-emerald-600" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Giải thích — chỉ hiện sau khi trả lời */}
        <AnimatePresence>
          {isAnswered && question.explanation && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="pt-1"
            >
              <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-bold text-foreground mr-1">Giải thích:</span>
                  {question.explanation}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
