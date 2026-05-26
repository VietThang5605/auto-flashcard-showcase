-- MIGRATION: 003_decks_and_flashcard_fields.sql
-- Thêm hệ thống Deck lồng nhau và các trường mới cho flashcards.
--
-- Thay đổi:
-- 1. Bảng mới `decks` — hỗ trợ parent_id tự tham chiếu (tối đa 3 cấp)
-- 2. Cột mới `word_type` trong flashcards — lưu noun/verb/adjective/...
-- 3. Cột mới `meaning_vi` trong flashcards — nghĩa tiếng Việt ngắn gọn (vd: "con mèo")
-- 4. Cột mới `deck_id` trong flashcards — liên kết flashcard → deck

-- ========== 1. BẢNG DECKS ==========

CREATE TABLE IF NOT EXISTS public.decks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- parent_id = NULL nghĩa là deck ở cấp root; có giá trị = deck con
  parent_id UUID REFERENCES public.decks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  -- Màu hex để accent deck card (border/background)
  color TEXT DEFAULT '#6366f1',
  -- Emoji icon hiển thị trong deck card
  icon TEXT DEFAULT '📁',
  -- Thứ tự sắp xếp trong cùng parent
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index cho việc fetch decks theo user + parent level
CREATE INDEX IF NOT EXISTS idx_decks_user_parent ON public.decks (user_id, parent_id);

-- ========== 2. CỘT MỚI TRONG FLASHCARDS ==========

-- word_type: loại từ mà AI trả về (noun, verb, adjective, adverb, phrase, idiom, ...)
-- Trước đây bị bỏ qua khi save, nay lưu vào DB để hiển thị ở thư viện
ALTER TABLE public.flashcards
  ADD COLUMN IF NOT EXISTS word_type TEXT;

-- meaning_vi: nghĩa tiếng Việt ngắn gọn 1-3 từ — dùng AI tạo ra
-- Ví dụ: "cat" → "con mèo", "overwhelmed" → "quá tải" (khác với definition_vi dài hơn)
ALTER TABLE public.flashcards
  ADD COLUMN IF NOT EXISTS meaning_vi TEXT;

-- deck_id: flashcard thuộc deck nào — NULL = không thuộc deck nào (root level)
ALTER TABLE public.flashcards
  ADD COLUMN IF NOT EXISTS deck_id UUID;

-- Xóa liên kết khóa ngoại cũ (nếu đã từng lỡ chạy ON DELETE SET NULL)
ALTER TABLE public.flashcards 
  DROP CONSTRAINT IF EXISTS flashcards_deck_id_fkey;

-- Gắn lại khóa ngoại với chuẩn ON DELETE CASCADE: nếu deck bị xóa, tất cả các flashcard bên trong cũng bị xóa
ALTER TABLE public.flashcards
  ADD CONSTRAINT flashcards_deck_id_fkey 
  FOREIGN KEY (deck_id) REFERENCES public.decks(id) ON DELETE CASCADE;

-- Index để lọc flashcards theo deck nhanh hơn
CREATE INDEX IF NOT EXISTS idx_flashcards_deck ON public.flashcards (deck_id);

-- ========== 3. ROW LEVEL SECURITY ==========

ALTER TABLE public.decks ENABLE ROW LEVEL SECURITY;

-- Users chỉ có thể quản lý deck của chính mình
CREATE POLICY "Users manage own decks" ON public.decks
  FOR ALL USING (auth.uid() = user_id);
