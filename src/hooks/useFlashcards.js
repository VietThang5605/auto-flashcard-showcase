// --- hooks/useFlashcards.js ---
"use client";

import React, { useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { toast } from "sonner";

export function useFlashcards({
  search = "",
  sortBy = "created_at",
  sortOrder = "desc",
  bookmarkedOnly = false,
  tagId = null,
  deckId = "all",
} = {}) {
  // Dùng useLiveQuery để UI tự động cập nhật khi IndexedDB thay đổi
  const flashcards = useLiveQuery(async () => {
    let collection = db.flashcards.toCollection();

    // Lọc theo mảng/bộ lọc cơ bản
    // Lưu ý: với Dexie, query càng phức tạp càng nên dùng filter() trên toàn collection
    // nếu data nhỏ/vừa (dưới 10k items).
    let results = await db.flashcards.filter(f => {
      // Bỏ qua các thẻ bị xóa mềm
      if (f.is_deleted) return false;
      
      if (bookmarkedOnly && !f.is_bookmarked) return false;
      if (search && !f.word.toLowerCase().includes(search.toLowerCase())) return false;
      
      if (deckId === null) {
        if (f.deck_id !== null) return false;
      } else if (deckId !== "all") {
        if (f.deck_id !== deckId) return false;
      }

      if (tagId) {
        // Tag logic: check nếu trong flashcard_tags có tag_id này
        const hasTag = f.flashcard_tags && f.flashcard_tags.some(t => t.tag_id === tagId);
        if (!hasTag) return false;
      }

      return true;
    }).toArray();

    // Sắp xếp offline
    results.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];
      
      // Xử lý case chuỗi/word
      if (typeof valA === 'string') {
        const order = valA.localeCompare(valB);
        return sortOrder === "asc" ? order : -order;
      }
      
      // Mặc định (như date/số)
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return results;
  }, [search, sortBy, sortOrder, bookmarkedOnly, tagId, deckId]);

  const isLoading = flashcards === undefined;
  const error = null;

  const toggleBookmark = useCallback(async (id, currentValue) => {
    try {
      const now = new Date().toISOString();
      await db.transaction('rw', db.flashcards, db.sync_queue, async () => {
        // Cập nhật local db
        await db.flashcards.update(id, { 
          is_bookmarked: !currentValue,
          updated_at: now
        });
        
        // Đẩy vào hàng đợi sync_queue
        await db.sync_queue.add({
          table: 'flashcards',
          record_id: id,
          action: 'UPDATE',
          created_at: now,
          update_data: { is_bookmarked: !currentValue }
        });
      });
    } catch (err) {
      console.error("Lỗi cập nhật bookmark:", err);
      toast.error("Không thể cập nhật!");
    }
  }, []);

  const deleteFlashcard = useCallback(async (id, showToast = true) => {
    try {
      const now = new Date().toISOString();
      await db.transaction('rw', db.flashcards, db.sync_queue, async () => {
        // Soft delete ở local
        await db.flashcards.update(id, { 
          is_deleted: true,
          updated_at: now 
        });
        
        // Thêm vào hàng đợi sync_queue đánh is_deleted
        await db.sync_queue.add({
          table: 'flashcards',
          record_id: id,
          action: 'UPDATE', // soft delete dùng UPDATE
          created_at: now,
          update_data: { is_deleted: true }
        });
      });
      if (showToast) {
        toast.success("Đã xóa thẻ");
      }
      return true;
    } catch (err) {
      console.error("Xóa thất bại:", err);
      toast.error("Không thể xóa thẻ");
      return false;
    }
  }, []);

  // Lấy 1 bản sao tức thời (không reactive)
  const refetch = useCallback(() => {}, []); 

  const optimisticRemove = useCallback((id) => {
    // Không cần dùng vì Dexie tự động reactive
  }, []);

  return {
    flashcards: flashcards || [],
    isLoading,
    error,
    refetch,
    toggleBookmark,
    deleteFlashcard,
    optimisticRemove,
  };
}

export function useFlashcard(id) {
  const flashcard = useLiveQuery(() => id ? db.flashcards.get(id) : null, [id]);
  const isLoading = flashcard === undefined && id !== null;

  return { 
    flashcard, 
    isLoading, 
    error: null, 
    refetch: () => {} 
  };
}
