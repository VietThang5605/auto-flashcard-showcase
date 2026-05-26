-- supabase/migrations/007_notification_tracking.sql
-- Thêm cột tracking để tránh gửi thông báo trùng lặp trong cùng một ngày.
-- Logic: Chỉ gửi nếu last_morning_notified_at < today (giờ VN)

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS last_morning_notified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_evening_notified_at TIMESTAMPTZ;
