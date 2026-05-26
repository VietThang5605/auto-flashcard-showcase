import { FlashcardsClient } from "./FlashcardsClient";

export const metadata = {
  title: "Thư viện | Auto-Flashcard PWA",
  description: "Quản lý thư viện thẻ từ vựng của bạn",
};

export default function FlashcardsPage() {
  return (
    <div className="max-w-6xl mx-auto h-full">
      <FlashcardsClient />
    </div>
  );
}
