-- MIGRATION: 001_initial_schema.sql
-- Triển khai toàn bộ schema cho dự án Auto-Flashcard PWA.

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLES

-- Bảng profiles (mở rộng từ auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  preferred_ai TEXT DEFAULT 'openai',
  daily_goal INTEGER DEFAULT 10,
  push_subscription JSONB,
  push_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng tags
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng flashcards
CREATE TABLE IF NOT EXISTS public.flashcards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  context TEXT,
  phonetic TEXT,
  definition_en TEXT,
  definition_vi TEXT,
  explanation_en TEXT,
  explanation_vi TEXT,
  examples JSONB DEFAULT '[]'::jsonb,
  synonyms JSONB DEFAULT '[]'::jsonb,
  antonyms JSONB DEFAULT '[]'::jsonb,
  related_words JSONB DEFAULT '[]'::jsonb,
  quiz_questions JSONB DEFAULT '[]'::jsonb,
  ai_provider TEXT,
  is_bookmarked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, word) -- Ngăn mỗi user tạo nhiều thẻ trùng lặp từ giống nhau
);

-- Bảng flashcard_tags (n-n)
CREATE TABLE IF NOT EXISTS public.flashcard_tags (
  flashcard_id UUID REFERENCES public.flashcards(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (flashcard_id, tag_id)
);

-- Bảng card_progress (Spaced Repetition tracking)
CREATE TABLE IF NOT EXISTS public.card_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  flashcard_id UUID NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
  ease_factor FLOAT DEFAULT 2.5 CHECK (ease_factor >= 1.3),
  interval INTEGER DEFAULT 0,
  repetitions INTEGER DEFAULT 0,
  next_review_date TIMESTAMPTZ DEFAULT NOW(),
  last_reviewed_at TIMESTAMPTZ,
  total_reviews INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, flashcard_id)
);

CREATE INDEX idx_card_progress_next_review ON public.card_progress (user_id, next_review_date);

-- Bảng review_logs (Lịch sử ôn tập)
CREATE TABLE IF NOT EXISTS public.review_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  flashcard_id UUID NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
  quality INTEGER NOT NULL CHECK (quality >= 0 AND quality <= 3),
  reviewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TRIGGER TO AUTO-CREATE PROFILE
-- Tự động tạo profile khi một User mới đăng ký qua auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger nếu tồn tại rồi mới tạo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. ROW LEVEL SECURITY (RLS)
-- Bật RLS cho tất cả các bảng
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_logs ENABLE ROW LEVEL SECURITY;

-- Policies cho profiles
CREATE POLICY "Users có thể xem profile của chính mình" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users có thể update profile của chính mình" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Policies cho tags
CREATE POLICY "Users manage own tags" ON public.tags
  FOR ALL USING (auth.uid() = user_id);

-- Policies cho flashcards
CREATE POLICY "Users manage own flashcards" ON public.flashcards
  FOR ALL USING (auth.uid() = user_id);

-- Policies cho flashcard_tags
CREATE POLICY "Users manage own flashcard_tags" ON public.flashcard_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.flashcards 
      WHERE id = flashcard_tags.flashcard_id AND user_id = auth.uid()
    )
  );

-- Policies cho card_progress
CREATE POLICY "Users manage own progress" ON public.card_progress
  FOR ALL USING (auth.uid() = user_id);

-- Policies cho review_logs
CREATE POLICY "Users manage own logs" ON public.review_logs
  FOR ALL USING (auth.uid() = user_id);

-- 5. FUNCTION: process_review (SM-2 Spaced Repetition)
CREATE OR REPLACE FUNCTION process_review(
  p_user_id UUID,
  p_flashcard_id UUID,
  p_quality INTEGER  -- 0=Again, 1=Hard, 2=Good, 3=Easy → mapped to SM-2 q values
)
RETURNS JSONB AS $$
DECLARE
  v_progress card_progress%ROWTYPE;
  v_ef FLOAT;
  v_interval INTEGER;
  v_reps INTEGER;
  v_q INTEGER;
BEGIN
  -- Map UI buttons to SM-2 quality scale
  v_q := CASE p_quality
    WHEN 0 THEN 1
    WHEN 1 THEN 2
    WHEN 2 THEN 4
    WHEN 3 THEN 5
    ELSE 3
  END;

  SELECT * INTO v_progress FROM card_progress
  WHERE user_id = p_user_id AND flashcard_id = p_flashcard_id;

  IF NOT FOUND THEN
    INSERT INTO card_progress (user_id, flashcard_id, ease_factor, interval, repetitions, next_review_date, total_reviews)
    VALUES (p_user_id, p_flashcard_id, 2.5, 0, 0, NOW(), 0)
    RETURNING * INTO v_progress;
  END IF;

  v_ef := v_progress.ease_factor;

  IF v_q < 3 THEN
    v_reps := 0;
    v_interval := 1;
  ELSE
    v_reps := v_progress.repetitions + 1;
    IF v_reps = 1 THEN
      v_interval := 1;
    ELSIF v_reps = 2 THEN
      v_interval := 6;
    ELSE
      v_interval := CEIL(v_progress.interval * v_ef);
    END IF;
  END IF;

  v_ef := v_ef + (0.1 - (5 - v_q) * (0.08 + (5 - v_q) * 0.02));
  IF v_ef < 1.3 THEN v_ef := 1.3; END IF;

  UPDATE card_progress SET
    ease_factor = v_ef,
    interval = v_interval,
    repetitions = v_reps,
    next_review_date = NOW() + (v_interval || ' days')::INTERVAL,
    last_reviewed_at = NOW(),
    total_reviews = v_progress.total_reviews + 1
  WHERE id = v_progress.id;

  INSERT INTO review_logs (user_id, flashcard_id, quality, reviewed_at)
  VALUES (p_user_id, p_flashcard_id, p_quality, NOW());

  RETURN jsonb_build_object(
    'next_review_date', NOW() + (v_interval || ' days')::INTERVAL,
    'interval', v_interval,
    'ease_factor', v_ef,
    'repetitions', v_reps
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
