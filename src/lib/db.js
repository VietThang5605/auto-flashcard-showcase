import Dexie from 'dexie';

export const db = new Dexie('AutoFlashcardDB');

db.version(1).stores({
  // Bảng flashcards
  // Primary key là id. Chúng ta đánh index thêm cho deck_id, created_at, tags (tuỳ chọn), is_deleted, next_review_date
  flashcards: 'id, deck_id, created_at, is_bookmarked, is_deleted',

  // Bảng decks
  decks: 'id, created_at, is_deleted',

  // Bảng tags
  tags: 'id, is_deleted',

  // Bảng flashcard_tags (quan hệ nhiều-nhiều)
  flashcard_tags: '++, flashcard_id, tag_id',

  // Hàng đợi đồng bộ
  sync_queue: '++, table, record_id, action, created_at'
});
