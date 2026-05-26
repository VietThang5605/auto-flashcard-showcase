// --- src/hooks/usePushNotifications.js ---
// Hook xử lý việc xin quyền thông báo và đăng ký Device Token với Supabase.

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

// Chuyển đổi VAPID public key từ Base64 sang Uint8Array (yêu cầu của pushManager)
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [permission, setPermission] = useState("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  // Kiểm tra trạng thái hiện tại khi component mount
  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
      
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((subscription) => {
          setIsSubscribed(!!subscription);
          setIsLoading(false);
        });
      });
    } else {
      setIsLoading(false);
    }
  }, []);

  /**
   * Đăng ký nhận thông báo
   */
  const subscribeUser = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      toast.error("Trình duyệt của bạn không hỗ trợ Thông báo đẩy.");
      return;
    }

    try {
      setIsLoading(true);
      
      // 1. Xin quyền
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== "granted") {
        toast.error("Bạn đã từ chối quyền nhận thông báo.");
        setIsLoading(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const PUBLIC_VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      
      if (!PUBLIC_VAPID_KEY) {
         toast.error("Lỗi: Thiếu khóa PUBLIC VAPID KEY trong file .env.local");
         setIsLoading(false);
         return;
      }

      let subscription;
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
        });
      } catch (subErr) {
        console.error("Browser Push Subscribe Error:", subErr);
        toast.error("Trình duyệt không thể đăng ký Push: " + subErr.message);
        setIsLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const subJson = subscription.toJSON();
        const { error } = await supabase
          .from("push_subscriptions")
          .upsert({
            user_id: user.id,
            endpoint: subJson.endpoint, // Dùng endpoint làm khóa định danh duy nhất
            subscription: subJson,
            device_name: navigator.userAgent.split(') ')[0].split(' (')[1] || "Mobile Device"
          }, { onConflict: 'endpoint' });

        if (error) {
           console.error("Supabase Save Push Error:", error);
           toast.error("Không thể lưu đăng ký vào Database. Bạn đã chạy file SQL migration 006 chưa?");
           throw error;
        }
      }

      setIsSubscribed(true);
      toast.success("Đã đăng ký nhận nhắc hẹn học tập thành công! 🔔");
    } catch (err) {
      console.error("Lỗi đăng ký Push:", err);
      toast.error("Không thể đăng ký thông báo. Thử lại sau.");
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  /**
   * Hủy đăng ký
   */
  const unsubscribeUser = useCallback(async () => {
    try {
      setIsLoading(true);
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Xóa trên Database
        const subJson = subscription.toJSON();
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq('endpoint', subJson.endpoint);
          
        setIsSubscribed(false);
        toast.info("Đã tắt thông báo nhắc hẹn.");
      }
    } catch (err) {
      console.error("Lỗi hủy đăng ký Push:", err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  return {
    permission,
    isSubscribed,
    isLoading,
    subscribeUser,
    unsubscribeUser
  };
}
