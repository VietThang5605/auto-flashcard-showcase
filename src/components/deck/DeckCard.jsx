// --- components/deck/DeckCard.jsx ---
// Component hiển thị một Deck dưới dạng card trong grid.
// Hỗ trợ vai trò:
// 1. Clickable để navigate vào deck
// 2. Droppable target cho DnD (khi user kéo flashcard vào)
// 3. Menu: đổi tên/màu/icon, xóa
//
// Props:
// - deck: object từ DB { id, name, icon, color, description, ... }
// - onClick: () => void — navigate vào deck
// - onEdit: (deck) => void — mở dialog chỉnh sửa
// - onDelete: (id) => void — xóa deck
// - isDropTarget: boolean — đang được kéo thẻ vào (highlight)
// - subDeckCount: number (optional) — số lượng sub-decks
// - cardCount: number (optional) — số lượng thẻ trong deck

"use client";

import { MoreVertical, Pencil, Trash2, FolderOpen, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function DeckCard({
  deck,
  onClick,
  onEdit,
  onDelete,
  isDropTarget = false,
  subDeckCount = 0,
  cardCount = 0,
  index = 0,
}) {
  // Dùng color của deck làm màu accent — tạo nền nhạt và border/icon đậm hơn
  const accentColor = deck.color || "#6366f1";

  return (
    <div
      onClick={onClick}
      className={`
        group relative flex flex-col rounded-xl border-2 overflow-hidden cursor-pointer h-full
        transition-all duration-200 hover:shadow-md
        ${isDropTarget
          ? "border-dashed scale-105 shadow-lg"
          : "border-border/60 hover:border-opacity-80"
        }
      `}
      style={{
          // Border color thay đổi theo màu deck
          borderColor: isDropTarget ? accentColor : undefined,
          backgroundColor: isDropTarget ? `${accentColor}10` : undefined,
        }}
      >
        {/* Thanh màu trên đầu card */}
        <div
          className="h-1.5 w-full shrink-0"
          style={{ backgroundColor: accentColor }}
        />

        {/* Nội dung chính */}
        <div className="p-4 flex flex-col gap-3 bg-card">
          {/* Header: icon + name + menu */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Icon deck — emoji */}
              <span
                className="text-2xl w-10 h-10 flex items-center justify-center rounded-lg shrink-0"
                style={{ backgroundColor: `${accentColor}15` }}
              >
                {deck.icon || "📁"}
              </span>

              {/* Tên deck */}
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground text-sm leading-tight truncate">
                  {deck.name}
                </h3>
                {deck.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {deck.description}
                  </p>
                )}
              </div>
            </div>

            {/* Dropdown menu — ngăn sự kiện click của card */}
            <div onClick={(e) => e.stopPropagation()} className="shrink-0 -mt-0.5 -mr-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 rounded-full text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => onEdit?.(deck)}>
                    <Pencil className="w-3.5 h-3.5 mr-2" />
                    Chỉnh sửa deck
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/30"
                    onClick={() => {
                      if (confirm(`Xóa deck "${deck.name}"? TẤT CẢ các thẻ bên trong cũng sẽ bị xóa vĩnh viễn!`)) {
                        onDelete?.(deck.id);
                      }
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                    Xóa deck
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Footer: stats + arrow */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              {cardCount > 0 && (
                <span>{cardCount} thẻ</span>
              )}
              {subDeckCount > 0 && (
                <>
                  {cardCount > 0 && <span>·</span>}
                  <span>{subDeckCount} deck con</span>
                </>
              )}
              {cardCount === 0 && subDeckCount === 0 && (
                <span className="italic opacity-60">Trống</span>
              )}
            </span>
            <ChevronRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-80 group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>

        {/* Drop target overlay indicator */}
        {isDropTarget && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl pointer-events-none">
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-white shadow-lg"
              style={{ backgroundColor: accentColor }}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Thả vào đây
            </div>
          </div>
        )}
      </div>
  );
}
