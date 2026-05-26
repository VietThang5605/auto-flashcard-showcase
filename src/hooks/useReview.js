"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { db } from "@/lib/db";
import { calculateSM2 } from "@/lib/sm2";

export function useReview() {
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionStats, setSessionStats] = useState({
    reviewedCount: 0,
    correctCount: 0,
    newCards: 0,
    dueCards: 0,
  });

  const fetchQueue = useCallback(async () => {
    setIsLoading(true);
    try {
      const now = new Date().toISOString();
      const allCards = await db.flashcards.filter(f => !f.is_deleted).toArray();

      const dueCards = [];
      const newCards = [];

      for (const card of allCards) {
        if (card.progress) {
          if (card.progress.next_review_date <= now) {
            dueCards.push({
              ...card,
              repetitions: card.progress.repetitions,
              interval: card.progress.interval,
              ease_factor: card.progress.ease_factor,
              isNew: false
            });
          }
        } else {
          // Thẻ mới chưa học lần nào
          newCards.push({
            ...card,
            isNew: true
          });
        }
      }

      // Sắp xếp
      dueCards.sort((a, b) => a.progress.next_review_date.localeCompare(b.progress.next_review_date));
      newCards.sort((a, b) => a.created_at.localeCompare(b.created_at));

      // Lấy 50 due, 20 new
      const finalDue = dueCards.slice(0, 50);
      const finalNew = newCards.slice(0, 20);

      setQueue([...finalDue, ...finalNew]);
      setSessionStats(prev => ({
        ...prev,
        dueCards: finalDue.length,
        newCards: finalNew.length
      }));
    } catch (err) {
      console.error("[useReview Offline] Lỗi lấy thẻ:", err);
      toast.error("Không thể lấy danh sách ôn tập!");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const submitReview = useCallback(async (flashcardId, quality) => {
    try {
      const card = await db.flashcards.get(flashcardId);
      if (!card) return;

      const currentProgress = card.progress || {
        repetitions: 0,
        interval: 1,
        ease_factor: 2.5
      };

      // Gọi giải thuật SM2 lưu local
      const sm2Result = calculateSM2(
        quality,
        currentProgress.repetitions,
        currentProgress.interval,
        currentProgress.ease_factor
      );

      const nowIdx = new Date().toISOString();

      const newProgress = {
        updated_at: nowIdx,
        flashcard_id: flashcardId, 
        ease_factor: sm2Result.easeFactor,
        interval: sm2Result.interval,
        repetitions: sm2Result.repetitions,
        next_review_date: sm2Result.nextReviewDateOriginal,
        total_reviews: (currentProgress.total_reviews || 0) + 1
      };

      // Cập nhật IDB an toàn
      await db.transaction('rw', db.flashcards, db.sync_queue, async () => {
        // Update flashcard locally
        await db.flashcards.update(flashcardId, {
          progress: newProgress,
          updated_at: nowIdx // Update flashcard's updated_at too just to track
        });

        // Add to Sync Queue to push upsert to card_progress table!
        await db.sync_queue.add({
          table: 'card_progress',
          record_id: flashcardId,
          action: 'UPDATE', // This will map to `upsert` in SyncService
          created_at: nowIdx,
          update_data: newProgress
        });
      });

      // Update Session Stats
      setSessionStats(prev => ({
        ...prev,
        reviewedCount: prev.reviewedCount + 1,
        correctCount: prev.correctCount + (quality >= 2 ? 1 : 0)
      }));

      // Next card
      setCurrentIndex(prev => prev + 1);

    } catch (err) {
      console.error("Lỗi khi lưu review:", err);
      toast.error("Lỗi hệ thống khi chấm điểm.");
    }
  }, []);

  const isComplete = !isLoading && (queue.length === 0 || currentIndex >= queue.length);
  const progressPercent = queue.length > 0 ? (currentIndex / queue.length) * 100 : 0;
  const currentCard = queue[currentIndex] || null;

  return {
    isLoading,
    queue,
    currentCard,
    currentIndex,
    isComplete,
    progressPercent,
    submitReview,
    sessionStats,
  };
}
