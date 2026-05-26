// --- lib/syncService.js ---
// Dịch vụ quản lý luồng đồng bộ giữa IndexedDB (Dexie) và Supabase.
// Dựa trên cơ chế LWW (Last Write Wins) qua updated_at.

import { createClient } from "@/lib/supabase/client";
import { db } from "./db";

/**
 * Thực hiện công tác đồng bộ Push (Local -> Server) và Pull (Server -> Local).
 */
export const syncService = {
  // Thực hiện đồng bộ 2 chiều an toàn
  async sync() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // Chỉ đồng bộ khi có phiên đăng nhập

    try {
      // 1. PUSH MAPPING: Đẩy các thay đổi từ hàng đợi (sync_queue) lên server
      await this.pushChanges(supabase, user.id);

      // 2. PULL MAPPING: Lấy dữ liệu mới nhất từ server về local
      await this.pullChanges(supabase, user.id);
      
    } catch (err) {
      console.error("[SyncService] Đồng bộ thất bại:", err);
      throw err;
    }
  },

  async pushChanges(supabase, userId) {
    // Lấy toàn bộ hàng đợi đẩy lên kèm khóa chính (do dùng ++ ẩn)
    const queueItems = await db.sync_queue.toArray();
    const queueKeys = await db.sync_queue.toCollection().primaryKeys();
    
    if (queueItems.length === 0) return;

    for (let i = 0; i < queueItems.length; i++) {
      const item = queueItems[i];
      const primaryKey = queueKeys[i];
      
      try {
        const { table, record_id, action, created_at, update_data, ...restData } = item;

        if (action === 'UPDATE' || action === 'DELETE') {
          if (table === 'card_progress') {
             // 1. Dùng maybeSingle để tránh ném lỗi PGRST116
             const { data: existing, error: fetchErr } = await supabase.from('card_progress')
                 .select('updated_at').eq('user_id', userId).eq('flashcard_id', record_id).maybeSingle();
                 
             if (fetchErr) {
                 console.error("Lỗi fetch LWW card_progress:", fetchErr);
                 throw fetchErr;
             }

             if (!existing) {
                 const { error: insertErr } = await supabase.from('card_progress').insert({
                    user_id: userId,
                    flashcard_id: record_id,
                    ...update_data,
                    updated_at: created_at
                 });
                 if (insertErr) { console.error("Insert card progress error: ", insertErr); throw insertErr; }
             } else {
                 if (new Date(created_at).getTime() >= new Date(existing.updated_at).getTime()) {
                     const { error: updateErr } = await supabase.from('card_progress').update({
                        ...update_data,
                        updated_at: created_at
                     }).eq('user_id', userId).eq('flashcard_id', record_id);
                     if (updateErr) { console.error("Update card progress error: ", updateErr); throw updateErr; }
                 } else {
                     console.log(`[LWW] Bỏ qua vì server tươi hơn. Client: ${created_at}, Server: ${existing.updated_at}`);
                 }
             }
          } else if (table === 'flashcards') {
            const { error } = await supabase.from('flashcards').update({
              ...update_data,
              updated_at: created_at
            }).eq('id', record_id).lt('updated_at', created_at); // LWW
            if (error) { console.error("Update flashcards error: ", error); throw error; }
          } else if (table === 'decks' || table === 'tags') {
             // Dùng logic giống card_progress để đề phòng Deck/Tag tạo lúc Offline (chưa có ID trên server)
             const { data: existing, error: fetchErr } = await supabase.from(table)
                 .select('updated_at').eq('id', record_id).maybeSingle();
                 
             if (fetchErr) {
                 console.error(`Lỗi fetch LWW ${table}:`, fetchErr);
                 throw fetchErr;
             }

             if (!existing) {
                 const { error: insertErr } = await supabase.from(table).insert({
                    id: record_id,
                    user_id: userId,
                    ...update_data,
                    updated_at: created_at
                 });
                 if (insertErr) { console.error(`Insert ${table} error:`, insertErr); throw insertErr; }
             } else {
                 if (new Date(created_at).getTime() >= new Date(existing.updated_at).getTime()) {
                     const { error: updateErr } = await supabase.from(table).update({
                        ...update_data,
                        updated_at: created_at
                     }).eq('id', record_id);
                     if (updateErr) { console.error(`Update ${table} error:`, updateErr); throw updateErr; }
                 } else {
                     console.log(`[LWW] Bỏ qua ${table} vì server tươi hơn.`);
                 }
             }
          }
        }
        
        // Remove item only if it succeeded
        await db.sync_queue.delete(primaryKey);
      } catch (e) {
        console.error(`[SyncService] Lỗi khi đẩy item ${primaryKey} ở bảng ${item.table}:`, e);
        // Vứt thẳng error message để UI có thể tóm được chi tiết lỗi Postgres
        throw new Error(`Đồng bộ chùn bước ở thẻ ${item.table}: ${e.message || e.details || 'Lỗi mạng'}`);
      }
    }
  },

  async pullChanges(supabase, userId) {
    // Lấy mốc đồng bộ trước đó
    const lastSyncStr = localStorage.getItem(`last_sync_${userId}`);
    const lastSync = lastSyncStr ? new Date(lastSyncStr).toISOString() : new Date("1970-01-01").toISOString();

    // Dùng transaction của Dexie để đảm bảo an toàn. 
    // Nếu sập mạng giữa chừng, transaction tự Rollback.
    try {
      // Fetch thay đổi từ server
      // 1. Decks
      const { data: decksData } = await supabase.from('decks')
        .select('*')
        .eq('user_id', userId)
        .gt('updated_at', lastSync);

      // 2. Tags
      const { data: tagsData } = await supabase.from('tags')
        .select('*')
        .eq('user_id', userId)
        .gt('updated_at', lastSync);

      // 3. Flashcards và Progress
      // Vì thay đổi ở progress tính luôn là thay đổi ở flashcard nên ta tách pull riêng
      const { data: fcData } = await supabase.from('flashcards')
        .select(`
          *,
          flashcard_tags(tag_id, tags(id, name, color)),
          card_progress(*)
        `)
        .eq('user_id', userId)
        .gt('updated_at', lastSync); // Lưu ý: Progress độc lập update có thể làm flashcard updated_at ko đổi nếu chưa kích hoạt trigger! (Trigger sẽ cần nối bảng).
      
      const { data: progressData } = await supabase.from('card_progress')
        .select('*')
        .eq('user_id', userId)
        .gt('updated_at', lastSync);

      // Ghi đè IndexedDB an toàn trong Transaction
      await db.transaction('rw', db.flashcards, db.decks, db.tags, async () => {
        if (decksData?.length) {
          await Promise.all(decksData.map(d => db.decks.put(d)));
        }
        if (tagsData?.length) {
          await Promise.all(tagsData.map(t => db.tags.put(t)));
        }
        
        if (fcData?.length) {
          for (const raw of fcData) {
            const { card_progress, flashcard_tags, ...mainFields } = raw;
            const progressObj = card_progress ? (Array.isArray(card_progress) ? card_progress[0] : card_progress) : null;
            
            // Xóa cứng ở db local nếu đã được đánh dấu soft delete
            if (raw.is_deleted) {
              await db.flashcards.delete(raw.id);
            } else {
              await db.flashcards.put({
                ...mainFields,
                progress: progressObj || undefined
              });
            }
          }
        }

        // Merge riêng rẽ update progress_cards (nóng) vào bảng flashcard idb
        if (progressData?.length) {
          for (const prog of progressData) {
            const fc = await db.flashcards.get(prog.flashcard_id);
            if (fc) {
              await db.flashcards.put({ ...fc, progress: prog });
            }
          }
        }
      });

      // Ghi nhận mốc tgian sau khi hoàn tất pull. Lùi lại 5 phút (300000ms)
      // để phòng ngừa Lệch đồng hồ (Clock Skew) giữa các thiết bị. Các bản ghi bị trùng sẽ được IndexedDB ghi đè (put) an toàn.
      const currentTime = new Date(Date.now() - 5 * 60000).toISOString();
      localStorage.setItem(`last_sync_${userId}`, currentTime);

    } catch (e) {
      console.error("[SyncService] Kéo dữ liệu thất bại, huỷ bỏ Transaction:", e);
      throw e;
    }
  },

  // Phương thức lưu card mới kèm sync lên server (yêu cầu mạng)
  async saveNewCard(supabase, userId, cardData) {
    const { error: insertError, data } = await supabase.from("flashcards").insert({
      user_id: userId,
      ...cardData,
      updated_at: new Date().toISOString()
    }).select().single();
    if (insertError) throw insertError;

    // Lưu vào Local IndexedDB ngay lập tức
    await db.flashcards.put({
      ...data,
      isNew: true // Đánh dấu chưa có progress
    });
    return data;
  }
};
