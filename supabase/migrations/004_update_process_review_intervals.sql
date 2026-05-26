-- Migration 004: Update `process_review` Spaced Repetition Intervals
-- Thay đổi cơ chế tính khoảng cách học bằng phút/giờ hỗ trợ các khoảng siêu ngắn (Learning steps).
-- Các thay đổi chính:
-- - Rất khó (Again): Chờ 1 phút (thay vì 1 ngày như hàm cũ)
-- - Khó (Hard): Chờ 10 phút
-- - Dễ (Good): 1 ngày (mặc định SM-2 rep 1) hoặc dãn ra tuỳ ef
-- - Rất dễ (Easy): Nhảy gặm 4 ngày hoặc nhân siêu hệ số easy 1.3

CREATE OR REPLACE FUNCTION process_review(
  p_user_id UUID,
  p_flashcard_id UUID,
  p_quality INTEGER  -- 0=Again, 1=Hard, 2=Good, 3=Easy
)
RETURNS JSONB AS $$
DECLARE
  v_progress card_progress%ROWTYPE;
  v_ef FLOAT;
  v_interval INTEGER;
  v_reps INTEGER;
  v_q INTEGER;
  v_next_review TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Lấy thông tin progress nếu có
  SELECT * INTO v_progress FROM card_progress
  WHERE user_id = p_user_id AND flashcard_id = p_flashcard_id;

  -- Nếu thẻ chưa học bao giờ
  IF NOT FOUND THEN
    INSERT INTO card_progress (user_id, flashcard_id, ease_factor, interval, repetitions, next_review_date, total_reviews)
    VALUES (p_user_id, p_flashcard_id, 2.5, 0, 0, NOW(), 0)
    RETURNING * INTO v_progress;
  END IF;

  v_ef := v_progress.ease_factor;

  -- Logic tính toán Thời gian Review kế tiếp chi tiết từng mốc (Áp dụng Learning Steps)
  IF p_quality = 0 THEN
    -- 0: Rất khó (Again) => Phải chờ 1 phút sau review lại
    v_reps := 0;
    v_interval := 0;
    v_next_review := NOW() + INTERVAL '1 minute';
  ELSIF p_quality = 1 THEN
    -- 1: Khó (Hard) => Chờ 10 phút sau
    v_reps := 0; 
    v_interval := 0;
    v_next_review := NOW() + INTERVAL '10 minutes';
  ELSIF p_quality = 2 THEN
    -- 2: Dễ (Good) => Chuyển sang mốc ngày
    v_reps := v_progress.repetitions + 1;
    IF v_reps = 1 THEN
      v_interval := 1;
      v_next_review := NOW() + INTERVAL '1 day';
    ELSIF v_reps = 2 THEN
      v_interval := 6;
      v_next_review := NOW() + INTERVAL '6 days';
    ELSE
      v_interval := CEIL(v_progress.interval * v_ef);
      v_next_review := NOW() + (v_interval || ' days')::INTERVAL;
    END IF;
  ELSIF p_quality = 3 THEN
    -- 3: Rất dễ (Easy) => Tăng vọt interval
    v_reps := v_progress.repetitions + 1;
    IF v_reps = 1 THEN
      v_interval := 4;
      v_next_review := NOW() + INTERVAL '4 days';
    ELSE
      -- Hệ số Easy Bonus = 1.3
      v_interval := CEIL(v_progress.interval * v_ef * 1.3);
      v_next_review := NOW() + (v_interval || ' days')::INTERVAL;
    END IF;
  END IF;

  -- Tính lại Ease Factor theo công thức chuẩn của SM-2
  v_q := CASE p_quality
    WHEN 0 THEN 1
    WHEN 1 THEN 2
    WHEN 2 THEN 4
    WHEN 3 THEN 5
    ELSE 3
  END;

  v_ef := v_ef + (0.1 - (5 - v_q) * (0.08 + (5 - v_q) * 0.02));
  IF v_ef < 1.3 THEN v_ef := 1.3; END IF;

  -- Cập nhật vào Databse
  UPDATE card_progress SET
    ease_factor = v_ef,
    interval = v_interval,
    repetitions = v_reps,
    next_review_date = v_next_review,
    last_reviewed_at = NOW(),
    total_reviews = v_progress.total_reviews + 1
  WHERE id = v_progress.id;

  -- Log lại phiên học
  INSERT INTO review_logs (user_id, flashcard_id, quality, reviewed_at)
  VALUES (p_user_id, p_flashcard_id, p_quality, NOW());

  RETURN jsonb_build_object(
    'status', 'success',
    'ease_factor', v_ef,
    'interval', v_interval,
    'next_review_date', v_next_review
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
