// --- app/(app)/create/page.jsx ---
// Trang tạo flashcard mới — "Discovery Mode".
//
// Flow chính:
// 1. User nhập từ vựng (+ ngữ cảnh tuỳ chọn) vào FlashcardForm
// 2. FlashcardForm gọi POST /api/analyze → AI phân tích
// 3. Trong khi chờ: hiển thị AIAnalyzing skeleton
// 4. Kết quả trả về: hiển thị FlashcardView (định nghĩa, ví dụ, quiz)
// 5. User nhấn "Lưu" → lưu vào Supabase → toast success → reset form
//
// State machine: idle → analyzing → result → saving → idle (hoặc result)

import { Metadata } from "next";
import CreatePageClient from "./CreatePageClient";

export const metadata = {
  title: "Tạo flashcard mới — Auto Flashcard",
  description:
    "Nhập từ vựng tiếng Anh, AI sẽ tự động phân tích và tạo flashcard đầy đủ với định nghĩa, ví dụ, và câu hỏi quiz.",
};

// Server Component wrapper — metadata, rồi render client component
export default function CreatePage() {
  return <CreatePageClient />;
}
