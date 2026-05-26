// --- components/deck/DeckBreadcrumb.jsx ---
// Breadcrumb navigation khi user đang ở trong một deck lồng nhau.
// Hiển thị: Thư viện > Animals > Pets
// Mỗi segment đều clickable để di chuyển lên cấp tương ứng.
//
// Props:
// - path: Array<{id, name, icon}> — từ useDeckPath(), từ root → current
// - onNavigate: (deckId: string|null) => void — callback khi click vào segment
//   null nghĩa là về root (Thư viện)

"use client";

import { ChevronRight, BookOpen } from "lucide-react";

export function DeckBreadcrumb({ path = [], onNavigate }) {
  if (path.length === 0) return null;

  return (
    <nav className="flex items-center gap-1 text-sm flex-wrap" aria-label="Breadcrumb">
      {/* Root — luôn hiển thị */}
      <button
        onClick={() => onNavigate(null)}
        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors font-medium"
      >
        <BookOpen className="w-3.5 h-3.5 shrink-0" />
        Thư viện
      </button>

      {/* Các cấp deck từ root → current */}
      {path.map((deck, idx) => {
        const isCurrent = idx === path.length - 1;

        return (
          <span key={deck.id} className="flex items-center gap-1">
            {/* Separator */}
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />

            {isCurrent ? (
              // Cấp hiện tại — không clickable, hiển thị đậm hơn
              <span className="flex items-center gap-1 font-semibold text-foreground">
                <span>{deck.icon}</span>
                {deck.name}
              </span>
            ) : (
              // Cấp trên — clickable để navigate lên
              <button
                onClick={() => onNavigate(deck.id)}
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>{deck.icon}</span>
                {deck.name}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}
