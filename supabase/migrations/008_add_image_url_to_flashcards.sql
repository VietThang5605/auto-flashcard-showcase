-- MIGRATION: 008_add_image_url_to_flashcards.sql
-- Thêm cột image_url để lưu trữ link ảnh minh họa cho flashcard.

ALTER TABLE public.flashcards
  ADD COLUMN IF NOT EXISTS image_url TEXT;
