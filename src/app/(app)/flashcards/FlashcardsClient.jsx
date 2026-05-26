// --- app/(app)/flashcards/FlashcardsClient.jsx ---
// Client Component chính cho trang Thư viện.
// Chức năng:
// 1. Hiển thị decks + flashcards theo cấu trúc phân cấp
// 2. Navigate vào/ra các deck (breadcrumb + DeckBreadcrumb)
// 3. Drag & Drop: kéo flashcard vào deck để di chuyển
// 4. Tạo/sửa/xóa deck qua DeckCreateDialog
// 5. Search trong deck hiện tại (hoặc toàn bộ khi bật toggle)

"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Search, Filter, BookOpen, Plus, FolderPlus, Globe, FolderOpen,
  CheckSquare, Trash2, FolderInput, X, ListRestart
} from "lucide-react";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";

import { useFlashcards } from "@/hooks/useFlashcards";
import { useDecks, useDeckPath, useAllDecks } from "@/hooks/useDecks";
import { FlashcardListCard } from "@/components/flashcard/FlashcardListCard";
import { FlashcardDetailModal } from "@/components/flashcard/FlashcardDetailModal";
import { createClient } from "@/lib/supabase/client";
import { DeckCard } from "@/components/deck/DeckCard";
import { DeckBreadcrumb } from "@/components/deck/DeckBreadcrumb";
import { DeckCreateDialog } from "@/components/deck/DeckCreateDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

// =====================================================
// Main Component
// =====================================================

export function FlashcardsClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Navigation state — Read from URL to support Browser Back/Forward
  const currentDeckId = searchParams.get("deck") || null;

  const setCurrentDeckId = useCallback((id) => {
    const params = new URLSearchParams(searchParams);
    if (id) {
      params.set("deck", id);
    } else {
      params.delete("deck");
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, pathname, router]);

  // Search
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch] = useDebounce(searchTerm, 300);
  const [globalSearch, setGlobalSearch] = useState(false); // tìm toàn bộ hay trong deck hiện tại

  // Filter / Sort
  const [sortBy, setSortBy] = useState("created_at");
  const [filterState, setFilterState] = useState("all");

  // Modal chi tiết flashcard
  const [selectedCardId, setSelectedCardId] = useState(null);

  // Modal chuyển thư mục
  const [movingCardId, setMovingCardId] = useState(null); // String = thẻ đơn lẻ, Array = mảng thẻ

  // Select Mode & Bulk Actions
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState([]);

  // Data fetching cho việc mảng/chuyển thư mục
  const { decks: allDecksLocal } = useAllDecks();

  // Dialog tạo/sửa deck
  const [isDeckDialogOpen, setIsDeckDialogOpen] = useState(false);
  const [editingDeck, setEditingDeck] = useState(null);

  // =====================
  // Data fetching
  // =====================

  // Deck path cho breadcrumb
  const deckPath = useDeckPath(currentDeckId);

  // Sub-decks ở cấp hiện tại
  const {
    decks,
    isLoading: decksLoading,
    createDeck,
    updateDeck,
    deleteDeck,
    moveFlashcard,
    refetch: refetchDecks,
  } = useDecks(currentDeckId);

  // Flashcards — filter theo deck hoặc search toàn bộ
  const effectiveDeckId = (debouncedSearch && globalSearch) ? "all" : currentDeckId;

  const {
    flashcards,
    isLoading: cardsLoading,
    toggleBookmark,
    deleteFlashcard,
    optimisticRemove,
    refetch: refetchCards,
  } = useFlashcards({
    search: debouncedSearch,
    sortBy,
    bookmarkedOnly: filterState === "bookmarked",
    deckId: effectiveDeckId,
  });

  const isLoading = decksLoading || cardsLoading;

  // Bắt đầu Sync hai query để chống chớp/layout shift
  const [syncedData, setSyncedData] = useState(() => ({
    decks: [],
    flashcards: [],
    isReady: false
  }));

  useEffect(() => {
    if (!decksLoading && !cardsLoading) {
      setSyncedData({
        decks: decks || [],
        flashcards: flashcards || [],
        isReady: true
      });
    }
  }, [decksLoading, cardsLoading, decks, flashcards, currentDeckId]);

  // Handle Loading Skeleton
  const showSkeleton = isLoading && !syncedData.isReady;

  // =====================
  // Handlers Cho Chuyển Thư Mục
  // =====================

  const handleOpenMoveDialog = useCallback((flashcardId) => {
    // Nếu truyền ID (String), set thẻ đó. Nếu truyển Array, set danh sách thẻ.
    setMovingCardId(flashcardId);
  }, []);

  const handleConfirmMove = useCallback(async (targetDeckId) => {
    if (!movingCardId) return;
    const targetDeck = allDecksLocal.find(d => d.id === targetDeckId);
    
    // Nếu chuyển vào thư viện gốc thì targetDeckId = null
    const finalTargetId = targetDeckId === "root" ? null : targetDeckId;

    if (finalTargetId === currentDeckId) {
       setMovingCardId(null);
       setIsSelectMode(false);
       setSelectedCardIds([]);
       return;
    }

    const idsToMove = Array.isArray(movingCardId) ? movingCardId : [movingCardId];
    for (const id of idsToMove) {
      optimisticRemove(id);
      await moveFlashcard(id, finalTargetId);
    }

    toast.success(
      `Đã chuyển ${idsToMove.length} thẻ vào "${targetDeck ? targetDeck.name : 'Thư viện gốc'}"`,
      { duration: 2500 }
    );
    
    refetchCards();
    setMovingCardId(null);
    setIsSelectMode(false);
    setSelectedCardIds([]);
  }, [movingCardId, allDecksLocal, moveFlashcard, optimisticRemove, refetchCards, currentDeckId]);

  // Transform allDecks thành cây có cấu trúc phân cấp (giống DeckPicker)
  const buildMoveTree = useCallback(() => {
    if (!allDecksLocal || allDecksLocal.length === 0) return [];
    const tree = [];
    const rootDecks = allDecksLocal.filter(d => !d.parent_id);

    const traverse = (decksList, depth) => {
      decksList.forEach(deck => {
        tree.push({ deck, depth });
        const children = allDecksLocal.filter(d => d.parent_id === deck.id);
        if (children.length > 0) {
          traverse(children, depth + 1);
        }
      });
    };

    traverse(rootDecks, 0);
    return tree;
  }, [allDecksLocal]);

  const moveTree = buildMoveTree();

  // =====================
  // Handlers
  // =====================

  const handleNavigateToDeck = useCallback((deckId) => {
    setCurrentDeckId(deckId);
    setSearchTerm(""); // Reset search khi navigate
    setGlobalSearch(false);
    setIsSelectMode(false);
    setSelectedCardIds([]);
  }, []);

  const handleCreateDeck = useCallback(async (formData) => {
    await createDeck({ ...formData, parent_id: currentDeckId });
  }, [createDeck, currentDeckId]);

  const handleEditDeck = useCallback(async (formData) => {
    if (!editingDeck) return;
    await updateDeck(editingDeck.id, formData);
    setEditingDeck(null);
  }, [editingDeck, updateDeck]);

  const handleOpenEditDeck = useCallback((deck) => {
    setEditingDeck(deck);
    setIsDeckDialogOpen(true);
  }, []);

  const handleDeleteDeck = useCallback(async (deckId) => {
    await deleteDeck(deckId);
    // Nếu đang ở trong deck bị xóa, quay về root
    // Khi currentDeckId về null, hook useFlashcards sẽ tự động đổi tham số truyền vào và lo liệu việc thay đổi nếu cần.
    if (currentDeckId === deckId) {
      setCurrentDeckId(null);
    }
  }, [deleteDeck, currentDeckId]);

  // Bulk Handlers
  const handleToggleSelectCard = useCallback((id) => {
    setSelectedCardIds(prev =>
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  }, []);

  const handleEnterSelectMode = useCallback((initialCardId = null) => {
    setIsSelectMode(true);
    if (initialCardId) {
      setSelectedCardIds([initialCardId]);
    } else {
      setSelectedCardIds([]);
    }
  }, []);

  const handleDeleteMultiple = useCallback(async () => {
    if (!selectedCardIds.length) return;
    if (!confirm(`Bạn có chắc muốn xóa ${selectedCardIds.length} thẻ đã chọn không?`)) return;

    for (const id of selectedCardIds) {
      optimisticRemove(id);
      await deleteFlashcard(id, false);
    }
    
    toast.success(`Đã xóa ${selectedCardIds.length} thẻ`);
    setIsSelectMode(false);
    setSelectedCardIds([]);
  }, [selectedCardIds, deleteFlashcard, optimisticRemove]);

  // =====================
  // Render
  // =====================

  return (
    <>
      <div className="space-y-5">
        {/* ===== PAGE HEADER ===== */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Thư viện</h1>
            </div>
            <p className="text-sm text-muted-foreground md:ml-10">
              Quản lý và ôn tập các từ vựng bạn đã lưu
            </p>
          </div>

          {/* Stats */}
          {!isLoading && (
            <div className="text-sm font-medium text-muted-foreground px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
              {decks.length > 0 && (
                <span>{decks.length} deck · </span>
              )}
              <span className="text-foreground">{flashcards?.length || 0}</span> thẻ
            </div>
          )}
        </div>

        {/* ===== BREADCRUMB — chỉ hiện khi đang trong deck ===== */}
        {currentDeckId && (
          <div className="px-3 py-2.5 rounded-xl bg-muted/40 border border-border/50">
            <DeckBreadcrumb path={deckPath} onNavigate={handleNavigateToDeck} />
          </div>
        )}

        {/* ===== TOOLBAR ===== */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex gap-2 w-full sm:w-auto flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={currentDeckId ? "Tìm trong deck này..." : "Tìm kiếm từ vựng..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10 border-border/60 bg-background/50 focus:bg-background"
              />
            </div>

            {/* Select Mode Toggle */}
            <Button
              variant={isSelectMode ? "secondary" : "outline"}
              size="sm"
              className={`h-10 gap-1.5 shrink-0 transition-colors ${isSelectMode ? "bg-primary/20 text-primary border-primary/50" : ""}`}
              onClick={() => {
                if (isSelectMode) {
                  setIsSelectMode(false);
                  setSelectedCardIds([]);
                } else {
                  handleEnterSelectMode();
                }
              }}
            >
              <CheckSquare className="w-4 h-4" />
              <span className="hidden sm:block">{isSelectMode ? "Hủy Chọn" : "Chọn Thẻ"}</span>
            </Button>
          </div>

          {/* Toggle Global Search — chỉ hiện khi đang trong deck và đang search */}
          {currentDeckId && debouncedSearch && (
            <Button
              variant={globalSearch ? "default" : "outline"}
              size="sm"
              className="h-10 gap-2 shrink-0"
              onClick={() => setGlobalSearch(!globalSearch)}
            >
              <Globe className="w-4 h-4" />
              {globalSearch ? "Toàn bộ thư viện" : "Tìm toàn bộ"}
            </Button>
          )}

          {/* Filters */}
          <div className="flex items-center gap-2 shrink-0">
            <Select value={filterState} onValueChange={setFilterState}>
              <SelectTrigger className="w-[130px] h-10">
                <Filter className="w-4 h-4 mr-1.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả thẻ</SelectItem>
                <SelectItem value="bookmarked">Đã đánh dấu</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px] h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Mới tạo nhất</SelectItem>
                <SelectItem value="word">Theo A-Z</SelectItem>
              </SelectContent>
            </Select>

            {/* Nút tạo deck */}
            <Button
              variant="outline"
              size="sm"
              className="h-10 gap-1.5"
              onClick={() => { setEditingDeck(null); setIsDeckDialogOpen(true); }}
            >
              <FolderPlus className="w-4 h-4" />
              <span className="hidden sm:block">Tạo Deck</span>
            </Button>
          </div>
        </div>

        {/* ===== CONTENT ===== */}
        {showSkeleton ? (
          <LoadingSkeleton />
        ) : (
          <div className="space-y-6">
            {/* --- DECK SECTION --- */}
            {syncedData.decks.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <FolderOpen className="w-3.5 h-3.5" />
                  Deck ({syncedData.decks.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {syncedData.decks.map((deck, idx) => (
                    <DeckCard
                      key={deck.id}
                      deck={deck}
                      index={idx}
                      onClick={() => handleNavigateToDeck(deck.id)}
                      onEdit={handleOpenEditDeck}
                      onDelete={handleDeleteDeck}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* --- FLASHCARD SECTION --- */}
            {syncedData.flashcards?.length > 0 ? (
              <section>
                {syncedData.decks.length > 0 && (
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    Thẻ từ vựng ({syncedData.flashcards.length})
                  </h2>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {syncedData.flashcards.map((fc, idx) => (
                    <FlashcardListCard
                      key={fc.id}
                      flashcard={fc}
                      index={idx}
                      onToggleBookmark={toggleBookmark}
                      onDelete={deleteFlashcard}
                      onMove={handleOpenMoveDialog}
                      onClick={() => {
                        if (isSelectMode) {
                          handleToggleSelectCard(fc.id);
                        } else {
                          setSelectedCardId(fc.id);
                        }
                      }}
                      isSelectMode={isSelectMode}
                      isSelected={selectedCardIds.includes(fc.id)}
                      onEnterSelectMode={handleEnterSelectMode}
                    />
                  ))}
                </div>
              </section>
            ) : syncedData.decks.length === 0 ? (
              /* Empty State — không có deck lẫn flashcard */
              <EmptyState
                searchTerm={searchTerm}
                filterState={filterState}
                currentDeckId={currentDeckId}
                onCreateDeck={() => { setEditingDeck(null); setIsDeckDialogOpen(true); }}
              />
            ) : null}
          </div>
        )}

        {/* ===== MODALS ===== */}
        <FlashcardDetailModal
          id={selectedCardId}
          onClose={() => setSelectedCardId(null)}
        />

        <DeckCreateDialog
          open={isDeckDialogOpen}
          onOpenChange={(open) => {
            setIsDeckDialogOpen(open);
            if (!open) setEditingDeck(null);
          }}
          editingDeck={editingDeck}
          parentId={currentDeckId}
          onSubmit={editingDeck ? handleEditDeck : handleCreateDeck}
        />
      </div>

        <Dialog open={!!movingCardId} onOpenChange={(open) => { if (!open) setMovingCardId(null); }}>
          <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Chuyển thẻ vào thư mục</DialogTitle>
            </DialogHeader>
            <div className="space-y-1.5 mt-4 max-h-[60vh] overflow-y-auto pr-2">
              <Button
                variant="ghost"
                className="w-full justify-start font-medium bg-primary/5 hover:bg-primary/10"
                onClick={() => handleConfirmMove("root")}
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                [Thư viện gốc]
              </Button>
              {moveTree.map(({ deck, depth }) => (
                <Button
                  key={deck.id}
                  variant="ghost"
                  className="w-full justify-start font-medium h-auto py-2.5"
                  style={{ paddingLeft: `${16 + depth * 24}px` }}
                  onClick={() => handleConfirmMove(deck.id)}
                >
                  {/* Indent indicator */}
                  {depth > 0 && (
                    <span className="text-muted-foreground/40 mr-1.5 opacity-50">{'└'}</span>
                  )}
                  <span className="text-lg shrink-0 mr-2">{deck.icon || "📁"}</span>
                  <span className="truncate text-foreground text-left">{deck.name}</span>
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Floating Action Bar (FAB) cho Bulk Actions */}
        {isSelectMode && (
          <div className="fixed bottom-[110px] md:bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 fade-in duration-200 w-max max-w-[90vw]">
            <div className="bg-foreground text-background shadow-xl rounded-full px-3 sm:px-4 py-2.5 flex items-center justify-center gap-2 sm:gap-4 overflow-x-auto">
              <span className="text-sm font-semibold whitespace-nowrap bg-background/20 px-2 py-1 rounded-full">
                {selectedCardIds.length} thẻ
              </span>
              
              <div className="w-px h-5 bg-background/30" />

              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-background hover:text-background hover:bg-background/20 h-8 gap-1.5 px-3"
                  onClick={() => setSelectedCardIds([])}
                  disabled={selectedCardIds.length === 0}
                >
                  <ListRestart className="w-4 h-4" />
                  <span className="hidden sm:inline">Bỏ chọn</span>
                </Button>

                <div className="w-px h-5 bg-background/30 mx-1 hidden sm:block" />

                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-background hover:text-background hover:bg-background/20 h-8 gap-1.5 px-3"
                  onClick={() => handleOpenMoveDialog(selectedCardIds)}
                  disabled={selectedCardIds.length === 0}
                >
                  <FolderInput className="w-4 h-4" />
                  <span className="hidden sm:inline">Chuyển</span>
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/20 h-8 gap-1.5 px-3"
                  onClick={handleDeleteMultiple}
                  disabled={selectedCardIds.length === 0}
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Xóa</span>
                </Button>
              </div>

              <div className="w-px h-5 bg-background/30" />

              <Button 
                variant="ghost" 
                size="icon"
                className="text-background/70 hover:text-background hover:bg-background/20 h-8 w-8 rounded-full"
                onClick={() => {
                  setIsSelectMode(false);
                  setSelectedCardIds([]);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
    </>
  );
}

// =====================================================
// Sub-components
// =====================================================

/** Skeleton loading state */
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-[100px] bg-muted/60 rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="h-[140px] bg-muted/60 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}

/** Empty state khi không có nội dung */
function EmptyState({ searchTerm, filterState, currentDeckId, onCreateDeck }) {
  const hasFilter = searchTerm || filterState === "bookmarked";

  return (
    <div className="text-center py-20 px-4 border border-dashed border-border/60 rounded-2xl bg-muted/20">
      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
        <BookOpen className="w-8 h-8 text-muted-foreground opacity-50" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">
        {hasFilter ? "Không tìm thấy kết quả" : currentDeckId ? "Deck này đang trống" : "Chưa có từ vựng nào"}
      </h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
        {hasFilter
          ? "Không tìm thấy kết quả phù hợp. Thử thay đổi bộ lọc."
          : currentDeckId
          ? "Kéo thả thẻ từ vựng vào đây, hoặc tạo thêm thẻ mới."
          : "Thư viện của bạn đang trống. Hãy tạo flashcard đầu tiên!"}
      </p>
      <div className="flex gap-3 justify-center">
        {!hasFilter && (
          <Button onClick={onCreateDeck} variant="outline">
            <Plus className="w-4 h-4 mr-1.5" />
            Tạo Deck
          </Button>
        )}
        <Button onClick={() => window.location.href = "/create"}>
          Tạo Flashcard mới
        </Button>
      </div>
    </div>
  );
}
