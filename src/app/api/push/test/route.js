// --- src/app/api/push/test/route.js ---
// API Route để gửi một thông báo Push thử nghiệm ngay lập tức cho user hiện tại.
// Dùng để kiểm tra xem cấu hình Push trên thiết bị có hoạt động không.

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import webpush from "web-push";

// Cấu hình VAPID
const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;

if (publicVapidKey && privateVapidKey) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || "mailto:admin@example.com",
    publicVapidKey,
    privateVapidKey
  );
}

export async function POST(request) {
  try {
    // 1. Lấy user hiện tại từ session (dùng client có cookie)
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Dùng Admin client để lấy subscriptions của user (bỏ qua RLS)
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: subscriptions, error: subError } = await adminSupabase
      .from("push_subscriptions")
      .select("subscription")
      .eq("user_id", user.id);

    if (subError) throw subError;

    if (!subscriptions || subscriptions.length === 0) {
      return Response.json(
        { error: "Không tìm thấy thiết bị nào đã đăng ký. Hãy bật thông báo trước." },
        { status: 404 }
      );
    }

    // 3. Gửi thông báo test tới tất cả thiết bị của user
    const payload = JSON.stringify({
      title: "🎉 Test thành công!",
      body: "Cấu hình Push Notification của bạn hoạt động tốt. Sẵn sàng nhận nhắc hẹn học tập rồi!",
      url: "/review",
    });

    const sendPromises = subscriptions.map(({ subscription }) =>
      webpush
        .sendNotification(subscription, payload)
        .catch((err) => {
          console.error("Test push failed:", err.statusCode);
          // Nếu 410 Gone (subscription hết hạn), xóa khỏi DB
          if (err.statusCode === 410) {
            adminSupabase
              .from("push_subscriptions")
              .delete()
              .eq("endpoint", subscription.endpoint)
              .then(() => console.log("Removed expired push subscription"));
          }
          return { error: err.message };
        })
    );

    const results = await Promise.all(sendPromises);
    const successCount = results.filter((r) => !r?.error).length;

    return Response.json({
      success: true,
      sent: successCount,
      total: subscriptions.length,
    });
  } catch (error) {
    console.error("Test Push Error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
