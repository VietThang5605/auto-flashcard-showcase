-- Migration 005: Anki SM-2 Variant Algorithm with Learning Steps
-- Cập nhật DB Function process_review để hỗ trợ các bước học (Learning Steps) giống Anki:
-- 1. New/Learning Phase (repetitions = 0 or 1)
-- 2. Graduated/Review Phase (repetitions >= 2)
-- Sử dụng số phút, số giờ, và số ngày rõ ràng cho từng chặng.

CREATE OR REPLACE FUNCTION process_review(
  p_user_id UUID,
  p_flashcard_id UUID,
  p_quality INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_progress card_progress%ROWTYPE;
  v_ef FLOAT;
  v_interval INTEGER; -- Lưu ý: Vẫn lưu interval theo ngày để tính tiếp khi Graduated
  v_reps INTEGER;
  v_q INTEGER;
  v_next_review TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Lấy thông tin progress nếu có
  SELECT * INTO v_progress FROM card_progress
  WHERE user_id = p_user_id AND flashcard_id = p_flashcard_id;

  IF NOT FOUND THEN
    INSERT INTO card_progress (user_id, flashcard_id, ease_factor, "interval", repetitions, next_review_date, total_reviews)
    VALUES (p_user_id, p_flashcard_id, 2.5, 0, 0, NOW(), 0)
    RETURNING * INTO v_progress;
  END IF;

  v_ef := v_progress.ease_factor;
  v_reps := v_progress.repetitions;
  v_interval := v_progress."interval";

  -- ========================================================
  -- LEARNING PHASE / NEW CARDS (reps = 0 hoặc reps = 1)
  -- ========================================================
  IF v_reps < 2 THEN
    IF p_quality = 0 THEN -- Again (Rất khó)
      v_reps := 0;
      v_interval := 0;
      v_next_review := NOW() + INTERVAL '1 minute';
  
    ELSIF p_quality = 1 THEN -- Hard (Khó)
      v_reps := 0;
      v_interval := 0;
      -- Thẻ mới thì phạt 6 phút
      v_next_review := NOW() + INTERVAL '6 minutes';
  
    ELSIF p_quality = 2 THEN -- Good (Dễ)
      IF v_reps = 0 THEN
        -- Học xong bước 1, lên bước 2 -> Chờ 10 phút
        v_reps := 1;
        v_interval := 0;
        v_next_review := NOW() + INTERVAL '10 minutes';
      ELSE
        -- Đã ở bước 2 mà tick Good -> Tốt nghiệp (Graduated) sang khoảng ngày
        v_reps := 2;
        v_interval := 1; -- set base interval 1 day
        v_next_review := NOW() + INTERVAL '12 hours'; -- Giãn ra sáng ngày mai (hoặc 12h thực tế)
      END IF;
  
    ELSIF p_quality = 3 THEN -- Easy (Rất dễ)
      -- Bấm dễ là Tốt nghiệp ngay lập tức không cần học bước 2
      v_reps := 2;
      v_interval := 4;
      v_next_review := NOW() + INTERVAL '4 days';
    END IF;

  -- ========================================================
  -- REVIEW PHASE / GRADUATED CARDS (reps >= 2)
  -- ========================================================
  ELSE
    IF p_quality = 0 THEN -- Again (Quên) -> Lapsed Card
      -- Rớt lại về trạng thái Học lại (Relearning)
      v_reps := 0;
      v_interval := 0;
      v_ef := GREATEST(1.3, v_ef - 0.20); -- Phạt EF nặng
      v_next_review := NOW() + INTERVAL '10 minutes';
  
    ELSIF p_quality = 1 THEN -- Hard (Card cũ nhưng Khó)
      -- Tăng nhẹ 20% interval
      v_reps := v_reps + 1;
      v_interval := GREATEST(1, CEIL(v_interval * 1.2));
      v_ef := GREATEST(1.3, v_ef - 0.15); -- Giảm EF
      v_next_review := NOW() + (v_interval || ' days')::INTERVAL;
  
    ELSIF p_quality = 2 THEN -- Good (Bình thường)
      v_reps := v_reps + 1;
      v_interval := GREATEST(1, CEIL(v_interval * v_ef));
      v_next_review := NOW() + (v_interval || ' days')::INTERVAL;
  
    ELSIF p_quality = 3 THEN -- Easy (Quá dễ)
      v_reps := v_reps + 1;
      v_interval := GREATEST(1, CEIL(v_interval * v_ef * 1.3)); -- Nhân thêm Easy bonus 1.3
      v_ef := v_ef + 0.15; -- Tăng tốc độ mọc rễ
      v_next_review := NOW() + (v_interval || ' days')::INTERVAL;
    END IF;
  END IF;

  -- Tính lại Ease Factor theo SM-2 cơ bản (Chỉ áp dụng khi Good)
  -- Bỏ qua bước này nếu đã tự cộng trừ ở nhánh IF-ELSE trên để tránh bị cộng dồn
  -- (Chúng ta sử dụng logic chỉnh sửa EF ở trên để cho linh động giống Anki)

  -- Cập nhật vào Database
  UPDATE card_progress SET
    ease_factor = v_ef,
    "interval" = v_interval,
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
    'repetitions', v_reps,
    'next_review_date', v_next_review
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
