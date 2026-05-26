// --- src/app/(app)/settings/page.jsx ---
// Trang cài đặt để quản lý thông báo PWA và giờ nhắc học.

"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase/client";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Bell, BellOff, Clock, Smartphone, Save, Loader2, Send, LogOut, Moon, Sun, Monitor } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { permission, isSubscribed, isLoading: isPushLoading, subscribeUser, unsubscribeUser } = usePushNotifications();
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [settings, setSettings] = useState({
    notify_morning_enabled: true,
    notify_morning_time: "08:00",
    notify_evening_enabled: true,
    notify_evening_time: "20:00",
  });

  const supabase = createClient();

  // Tránh hydration mismatch cho theme selector
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load settings từ Database
  useEffect(() => {
    async function loadSettings() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("user_settings")
          .select("*")
          .eq("user_id", user.id)
          .single();
        
        if (data) {
          setSettings({
            notify_morning_enabled: data.notify_morning_enabled,
            notify_morning_time: data.notify_morning_time.substring(0, 5),
            notify_evening_enabled: data.notify_evening_enabled,
            notify_evening_time: data.notify_evening_time.substring(0, 5),
          });
        }

        const lsync = localStorage.getItem(`last_sync_${user.id}`);
        if (lsync && !lsync.startsWith("1970")) {
          setLastSyncTime(new Date(lsync).toLocaleTimeString());
        }
      }
    }
    loadSettings();
  }, [supabase]);

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("user_settings")
        .upsert({
          user_id: user.id,
          ...settings,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      toast.success("Đã lưu cài đặt giờ nhắc học.");
    } catch (err) {
      console.error(err);
      toast.error("Không thể lưu cài đặt. Thử lại sau.");
    } finally {
      setIsSaving(false);
    }
  };

  // Gửi thông báo thử nghiệm ngay lập tức tới thiết bị hiện tại
  const handleTestNotification = async () => {
    try {
      setIsTesting(true);
      const res = await fetch("/api/push/test", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Gửi thất bại. Kiểm tra console.");
        return;
      }

      toast.success(`Đã gửi thông báo test tới ${data.sent}/${data.total} thiết bị! Kiểm tra màn hình của bạn.`);
    } catch (err) {
      console.error("Test notification error:", err);
      toast.error("Không thể kết nối tới server.");
    } finally {
      setIsTesting(false);
    }
  };

  // Đăng xuất
  const handleSignOut = async () => {
    try {
      setIsSaving(true);
      await supabase.auth.signOut();
      window.location.href = "/login";
    } catch (err) {
      toast.error("Lỗi khi đăng xuất.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Cài đặt</h1>
        <p className="text-muted-foreground">Quản lý ứng dụng và thông báo của bạn.</p>
      </div>

      {/* 0. Giao diện (Theme) */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="w-5 h-5 text-primary" />
            Giao diện
          </CardTitle>
          <CardDescription>
            Tùy chỉnh chế độ hiển thị sáng hoặc tối cho ứng dụng.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant={mounted && theme === "light" ? "default" : "outline"}
              className={`flex flex-col items-center gap-2 h-20 rounded-2xl ${
                mounted && theme === "light" ? "ring-2 ring-primary ring-offset-2 bg-primary/10 text-primary hover:bg-primary/20" : ""
              }`}
              onClick={() => setTheme("light")}
            >
              <Sun className="w-5 h-5" />
              <span className="text-xs font-medium">Sáng</span>
            </Button>
            <Button
              variant={mounted && theme === "dark" ? "default" : "outline"}
              className={`flex flex-col items-center gap-2 h-20 rounded-2xl ${
                mounted && theme === "dark" ? "ring-2 ring-primary ring-offset-2 bg-primary/10 text-primary hover:bg-primary/20" : ""
              }`}
              onClick={() => setTheme("dark")}
            >
              <Moon className="w-5 h-5" />
              <span className="text-xs font-medium">Tối</span>
            </Button>
            <Button
              variant={mounted && theme === "system" ? "default" : "outline"}
              className={`flex flex-col items-center gap-2 h-20 rounded-2xl ${
                mounted && theme === "system" ? "ring-2 ring-primary ring-offset-2 bg-primary/10 text-primary hover:bg-primary/20" : ""
              }`}
              onClick={() => setTheme("system")}
            >
              <Monitor className="w-5 h-5" />
              <span className="text-xs font-medium">Hệ thống</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 1. Đăng ký PWA & Push */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-primary" />
            Ứng dụng PWA & Thông báo
          </CardTitle>
          <CardDescription>
            Nhận thông báo nhắc học trực tiếp trên điện thoại hoặc máy tính.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/40 dark:bg-muted/15 border border-border/40">
            <div className="space-y-0.5">
              <div className="font-medium flex items-center gap-2 text-foreground">
                {isSubscribed ? <Bell className="w-4 h-4 text-green-500" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
                Trạng thái: {isSubscribed ? "Đã bật" : "Đã tắt"}
              </div>
              <div className="text-xs text-muted-foreground">
                {permission === "denied" 
                  ? "Bạn đã chặn quyền thông báo trên trình duyệt. Vui lòng mở lại trong cài đặt trình duyệt."
                  : "Bật để máy chủ có thể gửi lời nhắc khi đến hạn ôn tập."}
              </div>
            </div>
            <Button 
              variant={isSubscribed ? "outline" : "default"}
              onClick={isSubscribed ? unsubscribeUser : subscribeUser}
              disabled={isPushLoading || permission === "denied"}
              className="min-w-[120px]"
            >
              {isPushLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isSubscribed ? "Tắt thông báo" : "Bật thông báo"}
            </Button>
          </div>

          {/* Button test — chỉ hiện khi đã đăng ký */}
          {isSubscribed && (
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-dashed border-border/50">
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-foreground">Gửi thông báo thử nghiệm</div>
                <div className="text-xs text-muted-foreground">
                  Kiểm tra xem thiết bị của bạn có nhận được thông báo không.
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={handleTestNotification}
                disabled={isTesting}
                className="min-w-[120px] gap-2"
              >
                {isTesting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {isTesting ? "Đang gửi..." : "Gửi thử"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Đồng bộ Dữ liệu Offline */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            Đồng bộ Dữ liệu
          </CardTitle>
          <CardDescription>
            Tự động đồng bộ mỗi 5 phút khi có mạng. Bạn có thể nhấn để đồng bộ thủ công ngay lập tức.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/50">
            <div className="space-y-0.5">
              <div className="text-sm font-medium text-foreground">Trạng thái đồng bộ</div>
              <div className="text-xs text-muted-foreground" id="last-sync-time">
                {lastSyncTime ? `Lần gần nhất: ${lastSyncTime}` : "Sẵn sàng đồng bộ kết quả học tập của bạn."}
              </div>
            </div>
            <Button
              variant="default"
              onClick={async (e) => {
                const btn = e.currentTarget;
                try {
                  btn.disabled = true;
                  btn.innerText = "Đang đồng bộ...";
                  const { syncService } = await import("@/lib/syncService");
                  await syncService.sync();
                  setLastSyncTime(new Date().toLocaleTimeString());
                  toast.success("Đồng bộ dữ liệu thành công!");
                } catch (err) {
                  toast.error(err.message || "Đồng bộ thất bại, vui lòng kiểm tra mạng.");
                } finally {
                  btn.disabled = false;
                  btn.innerText = "Đồng bộ ngay";
                }
              }}
              className="min-w-[120px]"
            >
              Đồng bộ ngay
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 3. Lịch học */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Lịch nhắc học cố định
          </CardTitle>
          <CardDescription>
            Chọn thời điểm bạn muốn nhận thông báo tổng hợp các thẻ cần ôn trong ngày.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Nhắc sáng */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Switch 
                checked={settings.notify_morning_enabled}
                onCheckedChange={(val) => setSettings({...settings, notify_morning_enabled: val})}
              />
              <div>
                <div className="text-sm font-medium text-foreground">Nhắc nhở buổi sáng</div>
                <div className="text-xs text-muted-foreground">Gửi danh sách thẻ cần học bắt đầu ngày mới</div>
              </div>
            </div>
            <Input 
              type="time" 
              className="w-32 h-10 bg-background text-foreground" 
              value={settings.notify_morning_time}
              onChange={(e) => setSettings({...settings, notify_morning_time: e.target.value})}
              disabled={!settings.notify_morning_enabled}
            />
          </div>

          <div className="h-px bg-border/40" />

          {/* Nhắc tối */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Switch 
                checked={settings.notify_evening_enabled}
                onCheckedChange={(val) => setSettings({...settings, notify_evening_enabled: val})}
              />
              <div>
                <div className="text-sm font-medium text-foreground">Nhắc nhở buổi tối</div>
                <div className="text-xs text-muted-foreground">Ôn tập lại các thẻ còn sót trước khi đi ngủ</div>
              </div>
            </div>
            <Input 
              type="time" 
              className="w-32 h-10 bg-background text-foreground" 
              value={settings.notify_evening_time}
              onChange={(e) => setSettings({...settings, notify_evening_time: e.target.value})}
              disabled={!settings.notify_evening_enabled}
            />
          </div>

          <Button className="w-full mt-4 h-11" onClick={handleSaveSettings} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Lưu lịch nhắc học
          </Button>
        </CardContent>
      </Card>

      {/* 3. Tài khoản & Đăng xuất */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogOut className="w-5 h-5 text-primary" />
            Tài khoản
          </CardTitle>
          <CardDescription>
            Quản lý phiên đăng nhập của bạn trên thiết bị này.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            className="w-full text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 h-11 transition-colors"
            onClick={handleSignOut}
          >
            Đăng xuất khỏi ứng dụng
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
