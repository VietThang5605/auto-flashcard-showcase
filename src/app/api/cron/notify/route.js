// --- src/app/api/cron/notify/route.js ---
// API Route xử lý việc quét và gửi thông báo đẩy (Push) cho người dùng.
// Được thiết kế để chạy định kỳ qua GitHub Actions (mỗi 15 phút).
//
// THIẾT KẾ CHỐNG TRÙNG LẶP:
// Thay vì dùng cửa sổ thời gian ±7 phút (dễ bị gửi 2 lần nếu cron trễ),
// ta dùng logic đơn giản hơn và đáng tin cậy hơn:
//   → Chỉ gửi nếu: giờ hiện tại >= giờ hẹn VÀ hôm nay chưa gửi lần nào.
// Sau khi gửi, cập nhật last_morning/evening_notified_at = now.

import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

// Cấu hình VAPID (Thông tin định danh máy chủ gửi Push)
const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;

if (publicVapidKey && privateVapidKey) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || "mailto:admin@example.com",
    publicVapidKey,
    privateVapidKey
  );
}

export async function GET(request) {
  // 1. Xác thực: GitHub Actions/Vercel Cron gửi Authorization: Bearer <secret>.
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Admin client để bypass RLS (chỉ dùng server-side)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const now = new Date();

    // Lấy giờ/phút hiện tại theo timezone Việt Nam (server Vercel chạy UTC)
    const vnFormatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = vnFormatter.formatToParts(now);
    const currentHour = parseInt(parts.find((p) => p.type === "hour").value);
    const currentMinute = parseInt(parts.find((p) => p.type === "minute").value);
    const nowMinutesTotal = currentHour * 60 + currentMinute;

    // Lấy ngày hôm nay theo giờ VN (để so sánh "đã gửi hôm nay chưa")
    const todayVN = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(now); // "2026-04-11"

    // 2. Lấy toàn bộ user_settings có bật thông báo
    const { data: allSettings, error: settingsError } = await supabase
      .from("user_settings")
      .select(
        "user_id, notify_morning_enabled, notify_morning_time, notify_evening_enabled, notify_evening_time, last_morning_notified_at, last_evening_notified_at"
      )
      .or("notify_morning_enabled.eq.true,notify_evening_enabled.eq.true");

    if (settingsError) throw settingsError;
    if (!allSettings || allSettings.length === 0) {
      return Response.json({ success: true, sent_count: 0, reason: "Không có user nào bật thông báo" });
    }

    // 3. Lọc ra những user thực sự cần gửi thông báo lúc này
    // Điều kiện: giờ hiện tại >= giờ hẹn VÀ hôm nay chưa gửi
    const usersToNotify = allSettings.filter((s) => {
      const shouldSendMorning = checkShouldSend(
        s.notify_morning_enabled,
        s.notify_morning_time,
        s.last_morning_notified_at,
        nowMinutesTotal,
        todayVN
      );
      const shouldSendEvening = checkShouldSend(
        s.notify_evening_enabled,
        s.notify_evening_time,
        s.last_evening_notified_at,
        nowMinutesTotal,
        todayVN
      );
      // Gắn flag để biết gửi buổi nào
      s._sendMorning = shouldSendMorning;
      s._sendEvening = shouldSendEvening;
      return shouldSendMorning || shouldSendEvening;
    });

    if (usersToNotify.length === 0) {
      return Response.json({ success: true, sent_count: 0, reason: "Chưa đến giờ gửi cho ai" });
    }

    const userIds = usersToNotify.map((s) => s.user_id);

    // 4. Lấy push subscriptions của những user cần gửi
    const { data: allSubscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("user_id, subscription")
      .in("user_id", userIds);

    if (subError) throw subError;

    // Group subscriptions theo user_id
    const subsByUser = {};
    (allSubscriptions || []).forEach((sub) => {
      if (!subsByUser[sub.user_id]) subsByUser[sub.user_id] = [];
      subsByUser[sub.user_id].push(sub.subscription);
    });

    const notifications = [];
    const sentUserIds = { morning: [], evening: [] };

    for (const userSetting of usersToNotify) {
      const userSubs = subsByUser[userSetting.user_id];
      if (!userSubs || userSubs.length === 0) continue;

      // 5. Kiểm tra user có thẻ nào cần ôn TRONG NGÀY HÔM NAY không
      const endOfTodayISO = `${todayVN}T23:59:59+07:00`;
      const { count, error: countError } = await supabase
        .from("card_progress")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userSetting.user_id)
        .lte("next_review_date", endOfTodayISO);

      // 6. Chuẩn bị nội dung thông báo
      let title = "";
      let body = "";
      let url = "/review";

      if (count && count > 0) {
        title = "Đã đến giờ ôn tập! 🧠";
        body = `Bạn đang có ${count} thẻ từ vựng chờ được ôn tập. Hãy dành 5 phút ngay nhé!`;
        url = "/review"; // Điều hướng tới trang ôn tập
      } else {
        title = "Hôm nay bạn đã hoàn thành mục tiêu! ✨";
        body = "Bạn không còn thẻ nào cần ôn hôm nay. Hãy tạo thêm thẻ mới hoặc chụp ảnh để học thêm từ mới nhé!";
        url = "/flashcards"; // Điều hướng tới trang tạo thẻ/danh sách thẻ
      }

      // 7. Gửi push tới từng thiết bị
      for (const subscription of userSubs) {
        const payload = JSON.stringify({
          title: title,
          body: body,
          url: url,
        });

        notifications.push(
          webpush
            .sendNotification(subscription, payload)
            .catch((err) => {
              console.error("Push failed:", userSetting.user_id, err.statusCode);
              if (err.statusCode === 410) {
                supabase
                  .from("push_subscriptions")
                  .delete()
                  .eq("endpoint", subscription.endpoint);
              }
            })
        );
      }


      // Track để cập nhật last_notified_at sau khi gửi
      if (userSetting._sendMorning) sentUserIds.morning.push(userSetting.user_id);
      if (userSetting._sendEvening) sentUserIds.evening.push(userSetting.user_id);
    }

    await Promise.all(notifications);

    // 7. Cập nhật last_notified_at — QUAN TRỌNG: ngăn gửi trùng lặp các lần cron sau
    if (sentUserIds.morning.length > 0) {
      await supabase
        .from("user_settings")
        .update({ last_morning_notified_at: now.toISOString() })
        .in("user_id", sentUserIds.morning);
    }
    if (sentUserIds.evening.length > 0) {
      await supabase
        .from("user_settings")
        .update({ last_evening_notified_at: now.toISOString() })
        .in("user_id", sentUserIds.evening);
    }

    return Response.json({
      success: true,
      sent_count: notifications.length,
      morning_users: sentUserIds.morning.length,
      evening_users: sentUserIds.evening.length,
    });
  } catch (error) {
    console.error("Cron Notify Error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Kiểm tra có nên gửi thông báo cho user này không.
 * Điều kiện: enabled=true, giờ hiện tại >= giờ hẹn, hôm nay chưa gửi.
 *
 * @param {boolean} enabled - User có bật thông báo buổi này không
 * @param {string} notifyTime - Giờ hẹn dạng "HH:MM:SS" từ DB
 * @param {string|null} lastNotifiedAt - Timestamp lần gửi cuối (ISO string)
 * @param {number} nowMinutesTotal - Phút hiện tại (giờ * 60 + phút) theo giờ VN
 * @param {string} todayVN - Ngày hôm nay dạng "YYYY-MM-DD" theo giờ VN
 */
function checkShouldSend(enabled, notifyTime, lastNotifiedAt, nowMinutesTotal, todayVN) {
  if (!enabled || !notifyTime) return false;

  // Parse "HH:MM" hoặc "HH:MM:SS" từ Postgres TIME type
  const [h, m] = notifyTime.split(":").map(Number);
  const scheduleMinutes = h * 60 + m;

  // Chưa đến giờ → bỏ qua
  if (nowMinutesTotal < scheduleMinutes) return false;

  // Hôm nay đã gửi rồi → bỏ qua (đây là cơ chế chống trùng lặp chính)
  if (lastNotifiedAt) {
    const lastNotifiedDateVN = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(new Date(lastNotifiedAt));
    if (lastNotifiedDateVN === todayVN) return false;
  }

  return true;
}
