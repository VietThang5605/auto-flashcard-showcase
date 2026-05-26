-- --- supabase/migrations/006_push_notifications.sql ---
-- Cấu trúc chuẩn để lưu trữ Push Subscriptions và User Settings.

-- 1. Xóa bảng cũ nếu tồn tại (để làm sạch dữ liệu lỗi)
DROP TABLE IF EXISTS public.push_subscriptions;
DROP TABLE IF EXISTS public.user_settings;

-- 2. Bảng lưu trữ đăng ký Push của các thiết bị
CREATE TABLE public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE, -- Dùng endpoint làm khóa định danh duy nhất (Chuỗi TEXT)
    subscription JSONB NOT NULL,    -- Lưu trọn vẹn object PushSubscription
    device_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index để tìm nhanh theo user
CREATE INDEX idx_push_subs_user ON public.push_subscriptions(user_id);

-- 3. Bảng cấu hình giờ nhận thông báo cho người dùng
CREATE TABLE public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    notify_morning_enabled BOOLEAN DEFAULT TRUE,
    notify_morning_time TIME DEFAULT '08:00',
    notify_evening_enabled BOOLEAN DEFAULT TRUE,
    notify_evening_time TIME DEFAULT '20:00',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Kích hoạt Row Level Security (RLS)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- 5. Tạo chính sách bảo mật (Chỉ cho phép user thao tác trên dữ liệu của chính mình)
CREATE POLICY "Users can manage their own subscriptions" 
    ON public.push_subscriptions FOR ALL 
    TO authenticated 
    USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own settings" 
    ON public.user_settings FOR ALL 
    TO authenticated 
    USING (user_id = auth.uid());
