// --- hooks/useTags.js ---
"use client";

import { useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { toast } from "sonner";

export function useTags() {
  const tags = useLiveQuery(async () => {
    const results = await db.tags.filter(t => !t.is_deleted).toArray();
    return results.sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const isLoading = tags === undefined;
  const error = null;

  const createTag = useCallback(async (name, color = "blue") => {
    try {
      const newId = crypto.randomUUID();
      const now = new Date().toISOString();
      const newTag = {
        id: newId,
        name: name.trim(),
        color,
        created_at: now,
        updated_at: now,
        is_deleted: false,
      };

      await db.transaction('rw', db.tags, db.sync_queue, async () => {
        await db.tags.put(newTag);
        await db.sync_queue.add({
          table: 'tags',
          record_id: newId,
          action: 'UPDATE', // Sync UPSERT
          created_at: now,
          update_data: newTag
        });
      });

      toast.success("Tạo tag thành công");
      return newTag;
    } catch (err) {
      console.error("Create tag error:", err);
      toast.error("Không thể tạo tag");
      return null;
    }
  }, []);

  const updateTag = useCallback(async (id, updates) => {
    try {
      const now = new Date().toISOString();
      await db.transaction('rw', db.tags, db.sync_queue, async () => {
        await db.tags.update(id, { ...updates, updated_at: now });
        await db.sync_queue.add({
          table: 'tags',
          record_id: id,
          action: 'UPDATE',
          created_at: now,
          update_data: updates
        });
      });
      return true;
    } catch (err) {
      toast.error("Không thể cập nhật tag");
      return false;
    }
  }, []);

  const deleteTag = useCallback(async (id) => {
    try {
      const now = new Date().toISOString();
      await db.transaction('rw', db.tags, db.sync_queue, async () => {
        await db.tags.update(id, { is_deleted: true, updated_at: now });
        await db.sync_queue.add({
          table: 'tags',
          record_id: id,
          action: 'UPDATE', // soft delete
          created_at: now,
          update_data: { is_deleted: true }
        });
      });
      toast.success("Đã xóa tag");
      return true;
    } catch (err) {
      console.error("Delete tag error:", err);
      toast.error("Không thể xóa tag");
      return false;
    }
  }, []);

  return { 
    tags: tags || [], 
    isLoading, 
    error, 
    createTag, 
    updateTag,
    deleteTag, 
    refetch: () => {} 
  };
}
