// --- hooks/useDecks.js ---
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export function useDecks(parentId = null) {
  const decks = useLiveQuery(async () => {
    let results = await db.decks.filter(d => !d.is_deleted).toArray();
    
    // Filter by parentId
    results = results.filter(d => {
      if (parentId === null) return d.parent_id === null;
      return d.parent_id === parentId;
    });

    results.sort((a, b) => {
      if (a.position !== b.position && a.position !== undefined && b.position !== undefined) {
        return a.position - b.position;
      }
      return a.name.localeCompare(b.name);
    });

    return results;
  }, [parentId]);

  const isLoading = decks === undefined;
  const error = null;

  const createDeck = useCallback(async ({ name, description, color, icon, parent_id: overrideParent }) => {
    try {
      const targetParent = overrideParent !== undefined ? overrideParent : parentId;
      const newId = crypto.randomUUID();
      const now = new Date().toISOString();

      const newDeck = {
        id: newId,
        name: name.trim(),
        description: description?.trim() || null,
        color: color || "#6366f1",
        icon: icon || "📁",
        parent_id: targetParent || null,
        created_at: now,
        updated_at: now,
        is_deleted: false,
      };

      await db.transaction('rw', db.decks, db.sync_queue, async () => {
        await db.decks.put(newDeck);
        await db.sync_queue.add({
          table: 'decks',
          record_id: newId,
          action: 'UPDATE', // UPSERT on server
          created_at: now,
          update_data: newDeck
        });
      });

      toast.success(`Đã tạo deck "${name}" ✓`);
      return newDeck;
    } catch (err) {
      console.error("Lỗi tạo deck:", err);
      toast.error("Không thể tạo deck.");
      return null;
    }
  }, [parentId]);

  const updateDeck = useCallback(async (id, updates) => {
    try {
      const now = new Date().toISOString();
      await db.transaction('rw', db.decks, db.sync_queue, async () => {
        await db.decks.update(id, { ...updates, updated_at: now });
        await db.sync_queue.add({
          table: 'decks',
          record_id: id,
          action: 'UPDATE',
          created_at: now,
          update_data: updates
        });
      });
      return true;
    } catch (err) {
      console.error("Lỗi cập nhật deck:", err);
      toast.error("Không thể cập nhật deck");
      return false;
    }
  }, []);

  const deleteDeck = useCallback(async (id) => {
    try {
      const now = new Date().toISOString();
      await db.transaction('rw', db.decks, db.sync_queue, async () => {
        await db.decks.update(id, { is_deleted: true, updated_at: now });
        await db.sync_queue.add({
          table: 'decks',
          record_id: id,
          action: 'UPDATE', // soft delete
          created_at: now,
          update_data: { is_deleted: true }
        });
      });
      toast.success("Đã xóa deck ✓");
      return true;
    } catch (err) {
      console.error("Xóa thất bại:", err);
      toast.error("Không thể xóa deck");
      return false;
    }
  }, []);

  const moveFlashcard = useCallback(async (flashcardId, targetDeckId) => {
    try {
      const now = new Date().toISOString();
      await db.transaction('rw', db.flashcards, db.sync_queue, async () => {
        await db.flashcards.update(flashcardId, { deck_id: targetDeckId || null, updated_at: now });
        await db.sync_queue.add({
          table: 'flashcards',
          record_id: flashcardId,
          action: 'UPDATE',
          created_at: now,
          update_data: { deck_id: targetDeckId || null }
        });
      });
      return true;
    } catch (err) {
      console.error("Lỗi di chuyển thẻ:", err);
      toast.error("Không thể di chuyển thẻ");
      return false;
    }
  }, []);

  return {
    decks: decks || [],
    isLoading,
    error,
    refetch: () => {},
    createDeck,
    updateDeck,
    deleteDeck,
    moveFlashcard,
  };
}

export function useDeckPath(deckId) {
  const [path, setPath] = useState([]);

  useEffect(() => {
    if (!deckId) {
      setPath([]);
      return;
    }

    const buildPath = async () => {
      const pathArr = [];
      let currentId = deckId;

      while (currentId && pathArr.length < 3) {
        const deck = await db.decks.get(currentId);
        if (!deck || deck.is_deleted) break;
        pathArr.unshift(deck);
        currentId = deck.parent_id;
      }
      setPath(pathArr);
    };

    buildPath();
  }, [deckId]);

  return path;
}

export function useAllDecks() {
  const decks = useLiveQuery(
    () => db.decks.filter(d => !d.is_deleted).toArray()
  );
  
  return { 
    decks: (decks || []).sort((a,b) => a.name.localeCompare(b.name)), 
    isLoading: decks === undefined 
  };
}
