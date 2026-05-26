// --- components/deck/DeckCreateDialog.jsx ---
// Dialog tạo mới hoặc chỉnh sửa Deck.
// Hỗ trợ:
// - Nhập tên, mô tả (tuỳ chọn)
// - Chọn màu từ bảng màu preset
// - Chọn emoji icon
// - Chọn deck cha (nếu muốn tạo sub-deck, bị giới hạn 3 cấp)
//
// Props:
// - open: boolean
// - onOpenChange: (open: boolean) => void
// - onSubmit: (data: DeckFormData) => void
// - editingDeck: object|null — nếu có = đang sửa, nếu null = đang tạo mới
// - parentId: string|null — deck cha mặc định khi mở dialog
// - currentDepth: number — độ sâu hiện tại, dùng để limit chọn parent

"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAllDecks } from "@/hooks/useDecks";

// Bảng màu preset cho deck — 9 màu đa dạng
const DECK_COLORS = [
  { value: "#6366f1", label: "Indigo" },
  { value: "#8b5cf6", label: "Violet" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#06b6d4", label: "Cyan" },
  { value: "#10b981", label: "Emerald" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#ef4444", label: "Red" },
  { value: "#ec4899", label: "Pink" },
  { value: "#6b7280", label: "Gray" },
];

// Tập emoji icon phổ biến để chọn nhanh
const DECK_ICONS = [
  "📁", "📚", "🗂️", "📖", "🎯", "🌟", "🔬", "💼",
  "🌍", "🎨", "🏋️", "🎵", "✈️", "🏠", "🍕", "💡",
  "🧠", "📝", "🔤", "🇬🇧", "🇺🇸", "💬", "📊", "🎓",
];

export function DeckCreateDialog({
  open,
  onOpenChange,
  onSubmit,
  editingDeck = null,
  parentId = null,
  currentDepth = 0,
}) {
  const isEditing = !!editingDeck;

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(DECK_COLORS[0].value);
  const [icon, setIcon] = useState("📁");
  const [selectedParentId, setSelectedParentId] = useState(parentId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dùng để chọn deck cha — fetch tất cả decks phẳng
  const { decks: allDecks } = useAllDecks();

  // Khi mở dialog, điền dữ liệu từ editingDeck (nếu đang sửa)
  useEffect(() => {
    if (open) {
      if (editingDeck) {
        setName(editingDeck.name || "");
        setDescription(editingDeck.description || "");
        setColor(editingDeck.color || DECK_COLORS[0].value);
        setIcon(editingDeck.icon || "📁");
        setSelectedParentId(editingDeck.parent_id || null);
      } else {
        // Reset form khi tạo mới
        setName("");
        setDescription("");
        setColor(DECK_COLORS[0].value);
        setIcon("📁");
        setSelectedParentId(parentId);
      }
    }
  }, [open, editingDeck, parentId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || null,
        color,
        icon,
        parent_id: selectedParentId,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Lọc decks có thể chọn làm parent — loại trừ deck đang sửa và con cháu của nó
  // Chỉ cho chọn nếu depth < 2 (để tổng không vượt 3 cấp)
  const parentOptions = allDecks.filter(d => {
    if (isEditing && d.id === editingDeck?.id) return false;
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Chỉnh sửa Deck" : "Tạo Deck mới"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Tên deck */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Tên deck <span className="text-rose-500">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Từ vựng IELTS, Tiếng Anh hàng ngày..."
              className="h-10"
              maxLength={60}
              autoFocus
            />
          </div>

          {/* Mô tả (tuỳ chọn) */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Mô tả <span className="text-muted-foreground font-normal">(tuỳ chọn)</span>
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả ngắn về deck này..."
              className="h-10"
              maxLength={120}
            />
          </div>

          {/* Bảng chọn màu */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Màu sắc</label>
            <div className="flex gap-2 flex-wrap">
              {DECK_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-7 h-7 rounded-full transition-all duration-150 ${
                    color === c.value ? "ring-2 ring-offset-2 ring-foreground/50 scale-110" : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Bảng chọn icon */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Icon</label>
            <div className="flex gap-1.5 flex-wrap p-3 rounded-xl bg-muted/40 border border-border/50">
              {DECK_ICONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`w-9 h-9 rounded-lg text-lg transition-all duration-150 ${
                    icon === emoji
                      ? "ring-2 ring-primary bg-primary/10 scale-110"
                      : "hover:bg-muted hover:scale-105"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="p-3 rounded-xl bg-muted/30 border border-border/50 flex items-center gap-3">
            <span
              className="w-10 h-10 rounded-lg flex items-center justify-center text-2xl"
              style={{ backgroundColor: `${color}20` }}
            >
              {icon}
            </span>
            <div>
              <p className="font-semibold text-sm text-foreground">{name || "Tên deck"}</p>
              {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </div>
            <div className="ml-auto w-3 h-full rounded-full" style={{ backgroundColor: color, minHeight: "36px", width: "4px" }} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="min-w-[90px]"
            >
              {isSubmitting ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : isEditing ? "Lưu thay đổi" : "Tạo deck"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
