// --- components/flashcard/FlashcardForm.jsx ---
// Form nhập từ vựng để gửi cho AI phân tích.
// Giao diện "Discovery Mode" — trọng tâm vào ô nhập từ, tối giản.
//
// Props:
// - onAnalyze: (data: FlashcardData) => void — callback khi AI trả về kết quả
// - isLoading: boolean — trạng thái đang gọi API

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronDown, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

// Danh sách AI providers để user chọn
const AI_PROVIDERS = [
  {
    id: "openai",
    label: "OpenAI GPT-4o",
    description: "Nhanh, chính xác cao",
    icon: "🤖",
  },
  {
    id: "gemini",
    label: "Gemini Flash",
    description: "Nhanh, chi phí thấp",
    icon: "✨",
  },
];

// Danh sách Image providers để user chọn
const IMAGE_PROVIDERS = [
  {
    id: "unsplash",
    label: "Unsplash",
    description: "Ảnh nghệ thuật, cao cấp",
    icon: "📷",
  },
  {
    id: "pixabay",
    label: "Pixabay",
    description: "Ảnh đa dạng, minh họa",
    icon: "🖼️",
  },
];

export function FlashcardForm({ onAnalyze, onAnalyzingStart, onAnalyzeError, isLoading = false, initialImageProvider = "unsplash" }) {
  const [word, setWord] = useState("");
  const [context, setContext] = useState("");
  const [provider, setProvider] = useState("openai");
  const [imageProvider, setImageProvider] = useState(initialImageProvider);
  // Hiện/ẩn ô nhập context (ẩn mặc định để giao diện gọn gàng)
  const [showContext, setShowContext] = useState(false);

  const selectedProvider = AI_PROVIDERS.find((p) => p.id === provider);

  // Quản lý loading state nội bộ để disable form khi đang fetch
  const [internalLoading, setInternalLoading] = useState(false);
  const isCurrentlyLoading = isLoading || internalLoading;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!word.trim()) {
      toast.error("Vui lòng nhập từ hoặc cụm từ cần học");
      return;
    }

    // Thông báo cho parent TRƯỚC khi fetch — để parent chuyển sang phase "analyzing"
    // và hiển thị AIAnalyzing skeleton thay vì form
    onAnalyzingStart?.(provider);
    setInternalLoading(true);

    try {
      // Gọi API analyze server-side (API key bảo mật ở server)
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: word.trim(),
          context: context.trim() || null,
          provider,
          imageProvider,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Hiển thị error message từ server, quay về form để user thử lại
        toast.error(result.error || "Phân tích thất bại, vui lòng thử lại");
        onAnalyzeError?.();
        return;
      }

      // Truyền kết quả về component cha để hiển thị FlashcardView
      onAnalyze(result.data, provider, result.image_source);
    } catch (error) {
      console.error("[FlashcardForm] Fetch error:", error);
      toast.error("Lỗi kết nối. Kiểm tra internet và thử lại.");
      onAnalyzeError?.();
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4" id="flashcard-form">
      {/* Main input — từ cần học */}
      <div className="relative">
        <Input
          id="word-input"
          type="text"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder="Nhập từ hoặc cụm từ..."
          className="h-14 text-lg px-5 pr-36 rounded-xl border-2 
            focus-visible:border-primary focus-visible:ring-0
            transition-all duration-200 font-['var(--font-lora)']"
          disabled={isCurrentlyLoading}
          autoFocus
          maxLength={200}
        />

        {/* Character count — hiển thị khi gần đạt giới hạn */}
        {word.length > 150 && (
          <span className="absolute right-36 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {word.length}/200
          </span>
        )}

        {/* AI Provider selector + Submit button — bên trong input */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {/* Dropdown chọn AI provider */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 px-2 gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                disabled={isCurrentlyLoading}
              >
                <span>{selectedProvider?.icon}</span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {AI_PROVIDERS.map((p) => (
                <DropdownMenuItem
                  key={p.id}
                  onClick={() => setProvider(p.id)}
                  className="flex items-start gap-2 py-2"
                >
                  <span className="text-base mt-0.5">{p.icon}</span>
                  <div>
                    <div className="font-medium text-sm">{p.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.description}
                    </div>
                  </div>
                  {/* Checkmark cho provider đang được chọn */}
                  {provider === p.id && (
                    <span className="ml-auto text-primary text-xs">✓</span>
                  )}
                </DropdownMenuItem>
              ))}

              <div className="h-px bg-border my-1" />
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Nguồn ảnh
              </div>
              
              {IMAGE_PROVIDERS.map((p) => (
                <DropdownMenuItem
                  key={p.id}
                  onClick={() => setImageProvider(p.id)}
                  className="flex items-start gap-2 py-2"
                >
                  <span className="text-base mt-0.5">{p.icon}</span>
                  <div>
                    <div className="font-medium text-sm">{p.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.description}
                    </div>
                  </div>
                  {/* Checkmark cho image provider đang được chọn */}
                  {imageProvider === p.id && (
                    <span className="ml-auto text-primary text-xs">✓</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Nút Analyze */}
          <Button
            type="submit"
            size="sm"
            className="h-9 px-3 bg-primary hover:bg-primary/90 gap-1.5 disabled:opacity-80 disabled:cursor-not-allowed"
            disabled={isCurrentlyLoading || !word.trim()}
            id="analyze-btn"
          >
            {isCurrentlyLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span className="text-xs font-medium hidden sm:block">
              {isCurrentlyLoading ? "Đang phân tích..." : "Phân tích"}
            </span>
          </Button>
        </div>
      </div>

      {/* Toggle context input */}
      <div>
        <button
          type="button"
          onClick={() => setShowContext(!showContext)}
          className="text-xs font-medium text-foreground/70 hover:text-foreground transition-colors flex items-center gap-1"
          disabled={isCurrentlyLoading}
        >
          <ChevronDown
            className={`w-3 h-3 transition-transform duration-200 ${showContext ? "rotate-180" : ""}`}
          />
          {showContext ? "Ẩn ngữ cảnh" : "Thêm câu ví dụ / ngữ cảnh (tuỳ chọn)"}
        </button>

        {/* Context textarea — animate xuất hiện/ẩn */}
        <AnimatePresence>
          {showContext && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <textarea
                id="context-input"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Nhập câu chứa từ đó để AI hiểu đúng nghĩa... (vd: 'I was so overwhelmed by the workload')"
                className="mt-2 w-full min-h-[80px] px-4 py-3 text-sm rounded-xl border-2 
                  bg-background resize-none
                  focus:outline-none focus:border-primary
                  transition-all duration-200 placeholder:text-muted-foreground"
                disabled={isCurrentlyLoading}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Ngữ cảnh giúp AI phân tích đúng nghĩa khi từ có nhiều nghĩa khác nhau
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </form>
  );
}
