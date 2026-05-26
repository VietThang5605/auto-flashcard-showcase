// --- components/deck/DeckPicker.jsx ---
// Dropdown để chọn deck khi lưu flashcard.
// Hiển thị cây decks (indent theo độ sâu) — chọn một deck hoặc "Không thuộc deck nào".
//
// Props:
// - value: string|null — deck ID đang được chọn, null = không chọn
// - onValueChange: (deckId: string|null) => void
// - disabled: boolean

"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, FolderOpen, Folder, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAllDecks } from "@/hooks/useDecks";

export function DeckPicker({ value, onValueChange, disabled = false }) {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef(null);
  const { decks, isLoading } = useAllDecks();

  // Đóng dropdown khi click ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Tìm deck đang được chọn để hiển thị label
  const selectedDeck = decks.find(d => d.id === value);

  /**
   * Build cây decks phẳng theo thứ tự DFS (root → children) với indent level.
   * Trả về array: [{ deck, depth }]
   */
  const buildTree = () => {
    const tree = [];
    const rootDecks = decks.filter(d => !d.parent_id);

    const traverse = (decksList, depth) => {
      decksList.forEach(deck => {
        tree.push({ deck, depth });
        // Tìm children của deck này
        const children = decks.filter(d => d.parent_id === deck.id);
        if (children.length > 0) {
          traverse(children, depth + 1);
        }
      });
    };

    traverse(rootDecks, 0);
    return tree;
  };

  const tree = buildTree();

  return (
    <div className="relative" ref={pickerRef}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-sm
          transition-all duration-150
          ${disabled ? "opacity-50 cursor-not-allowed bg-muted" : "bg-background hover:border-primary/60 cursor-pointer"}
          ${open ? "border-primary ring-1 ring-primary/30" : "border-border/60"}
        `}
      >
        <span className="flex items-center gap-2 min-w-0">
          {selectedDeck ? (
            <>
              <span className="text-base">{selectedDeck.icon}</span>
              <span className="truncate text-foreground font-medium">{selectedDeck.name}</span>
            </>
          ) : (
            <>
              <FolderOpen className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Không thuộc deck nào</span>
            </>
          )}
        </span>

        <div className="flex items-center gap-1 shrink-0">
          {/* Nút xóa chọn */}
          {value && (
            <span
              onClick={(e) => { e.stopPropagation(); onValueChange(null); }}
              className="p-0.5 rounded text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border border-border shadow-lg rounded-xl overflow-hidden max-h-60 overflow-y-auto">
          {/* Option: không thuộc deck nào */}
          <button
            type="button"
            onClick={() => { onValueChange(null); setOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-muted/60 transition-colors ${!value ? "bg-primary/5" : ""}`}
          >
            <FolderOpen className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className={!value ? "font-medium text-primary" : "text-foreground"}>
              Không thuộc deck nào
            </span>
            {!value && <Check className="w-3.5 h-3.5 text-primary ml-auto" />}
          </button>

          {isLoading ? (
            <div className="px-3 py-2.5 text-xs text-muted-foreground">Đang tải...</div>
          ) : tree.length === 0 ? (
            <div className="px-3 py-2.5 text-xs text-muted-foreground italic">
              Chưa có deck nào. Tạo deck ở trang Thư viện.
            </div>
          ) : (
            tree.map(({ deck, depth }) => (
              <button
                key={deck.id}
                type="button"
                onClick={() => { onValueChange(deck.id); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/60 transition-colors ${value === deck.id ? "bg-primary/5" : ""}`}
                style={{ paddingLeft: `${12 + depth * 20}px` }}
              >
                {/* Indent indicator */}
                {depth > 0 && (
                  <span className="text-muted-foreground/40 mr-0.5">{'└'}</span>
                )}
                <span className="text-base shrink-0">{deck.icon}</span>
                <span
                  className={`truncate ${value === deck.id ? "font-medium text-primary" : "text-foreground"}`}
                >
                  {deck.name}
                </span>
                {value === deck.id && (
                  <Check className="w-3.5 h-3.5 text-primary ml-auto shrink-0" />
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
