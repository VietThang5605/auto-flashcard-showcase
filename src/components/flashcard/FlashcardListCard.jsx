// --- components/flashcard/FlashcardListCard.jsx ---
// Thẻ hiển thị rút gọn trong danh sách thư viện.
// Hiển thị: word + word_type badge + phonetic + meaning_vi + definition_vi
// Hỗ trợ drag (khi DnD được bật ở FlashcardsClient, wrapper sẽ bọc ngoài)
//
// Props:
// - flashcard: object từ DB (có word, phonetic, word_type, meaning_vi, definition_vi, ...)
// - onToggleBookmark: (id, currentValue) => void
// - onDelete: (id) => void
// - onClick: () => void — mở modal chi tiết
// - index: number — cho animation delay
// - isDragging: boolean — đang bị kéo (giảm opacity)

"use client";

import { Bookmark, Clock, MoreVertical, Trash2, FolderInput, CheckCircle2, Circle, CheckSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Màu badge cho word_type — khớp với FlashcardView.jsx
const WORD_TYPE_COLORS = {
  noun: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200 border border-blue-200/50 dark:border-blue-700/50",
  verb: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-200 border border-green-200/50 dark:border-green-700/50",
  adjective: "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-200 border border-purple-200/50 dark:border-purple-700/50",
  adverb: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-200 border border-orange-200/50 dark:border-orange-700/50",
  phrase: "bg-pink-100 text-pink-700 dark:bg-pink-950/50 dark:text-pink-200 border border-pink-200/50 dark:border-pink-700/50",
  idiom: "bg-pink-100 text-pink-700 dark:bg-pink-950/50 dark:text-pink-200 border border-pink-200/50 dark:border-pink-700/50",
};

/**
 * Thẻ hiển thị rút gọn trong danh sách thư viện.
 *
 * @param {Object} props
 * @param {Object} props.flashcard - Dữ liệu flashcard từ DB
 * @param {Function} props.onToggleBookmark
 * @param {Function} props.onDelete
 * @param {Function} props.onClick
 * @param {number} props.index
 * @param {boolean} props.isDragging - Khi đang drag, giảm opacity
 */
export function FlashcardListCard({
  flashcard,
  onToggleBookmark,
  onDelete,
  onMove,
  onClick,
  index = 0,
  isDragging = false,
  isSelectMode = false,
  isSelected = false,
  onEnterSelectMode,
}) {
  // Tìm màu badge theo word_type (lowercase để normalize)
  const wordTypeKey = flashcard.word_type?.toLowerCase();
  const wordTypeClass = WORD_TYPE_COLORS[wordTypeKey] || "bg-muted text-muted-foreground";

  return (
    <div className={`h-full opacity-100 ${isDragging ? "opacity-50" : ""}`}>
      <Card
        className={`group relative overflow-hidden flex flex-col h-full hover:shadow-md transition-all duration-200 cursor-pointer ${
          isSelectMode
            ? isSelected
              ? "border border-primary/80 ring-1 ring-primary/50 bg-primary/[0.02]"
              : "border border-border/50 opacity-80"
            : "border-border/50 hover:border-primary/40"
        }`}
        onClick={onClick}
      >
        <CardContent className="p-4 flex flex-col h-full gap-2 relative">
          {/* Checkbox Overlay (Khi Select Mode) */}
          {isSelectMode && (
            <div className="absolute top-3 left-3 z-10 transition-transform hover:scale-110">
              {isSelected ? (
                <CheckCircle2 className="w-6 h-6 text-primary fill-primary/20 bg-background rounded-full" />
              ) : (
                <Circle className="w-6 h-6 text-muted-foreground/40 bg-background/50 rounded-full" />
              )}
            </div>
          )}

          {/* Header: Word + word_type badge + Actions */}
          <div className="flex items-start justify-between gap-2">
            <div className={`min-w-0 flex-1 ${isSelectMode ? "pl-8" : ""}`}>
              {/* Word + word_type badge cùng hàng */}
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-bold text-foreground font-['var(--font-lora)'] break-all">
                  {flashcard.word}
                </h3>
                {/* Word type badge — chỉ hiện nếu có */}
                {flashcard.word_type && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize shrink-0 ${wordTypeClass}`}>
                    {flashcard.word_type}
                  </span>
                )}
              </div>

              {/* Phonetic + meaning_vi cùng hàng */}
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {flashcard.phonetic && (
                  <p className="text-xs text-muted-foreground font-mono">
                    {flashcard.phonetic}
                  </p>
                )}
                {/* Dấu phân cách — chỉ hiện khi có cả 2 */}
                {flashcard.phonetic && flashcard.meaning_vi && (
                  <span className="text-muted-foreground/30 text-xs">·</span>
                )}
                {/* Nghĩa tiếng Việt ngắn */}
                {flashcard.meaning_vi && (
                  <p className="text-xs font-semibold text-primary dark:text-primary">
                    {flashcard.meaning_vi}
                  </p>
                )}
              </div>
            </div>

            {/* Actions & Thumbnail */}
            <div className="flex flex-col items-end gap-2 shrink-0 -mt-1 -mr-1" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className={`w-8 h-8 rounded-full ${
                    flashcard.is_bookmarked
                      ? "text-primary hover:text-primary/80"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleBookmark(flashcard.id, flashcard.is_bookmarked);
                  }}
                >
                  <Bookmark
                    className="w-4 h-4"
                    fill={flashcard.is_bookmarked ? "currentColor" : "none"}
                  />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full text-muted-foreground">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {!isSelectMode && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onEnterSelectMode) onEnterSelectMode(flashcard.id);
                        }}
                      >
                        <CheckSquare className="w-4 h-4 mr-2" />
                        Chọn thẻ này
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onMove) onMove(flashcard.id);
                      }}
                    >
                      <FolderInput className="w-4 h-4 mr-2" />
                      Chuyển thư mục
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/30"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Bạn có chắc muốn xóa thẻ "${flashcard.word}" không?`)) {
                          onDelete(flashcard.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Xóa thẻ
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Thumbnail image */}
              {flashcard.image_url && (
                <div className="w-16 h-16 rounded-lg overflow-hidden border border-border/40 shadow-sm">
                  <img 
                    src={flashcard.image_url} 
                    alt={flashcard.word}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Body: Nghĩa tiếng Việt đầy đủ */}
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground line-clamp-2 leading-relaxed">
              {flashcard.definition_vi}
            </p>
          </div>

          {/* Footer: AI provider + thời gian */}
          <div className="flex items-center gap-2 mt-2 text-xs">
            {flashcard.ai_provider && (
              <span className="px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground opacity-70">
                {flashcard.ai_provider === "openai" ? "OpenAI" : "Gemini"}
              </span>
            )}
            <div className="flex-1" />
            <span className="text-muted-foreground flex items-center gap-1 opacity-70">
              <Clock className="w-3 h-3" />
              {typeof flashcard.created_at === "string"
                ? formatDistanceToNow(new Date(flashcard.created_at), { addSuffix: true, locale: vi })
                : "gần đây"}
            </span>
          </div>
        </CardContent>

        {/* Cạnh dưới highlight nhẹ */}
        <div className="h-1 w-full bg-border/40 group-hover:bg-primary/20 transition-colors" />
      </Card>
    </div>
  );
}
