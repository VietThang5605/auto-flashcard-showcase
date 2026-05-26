// --- lib/tts.js ---
// Wrapper cho Web Speech API (SpeechSynthesis).
// Phát âm từ vựng và câu ví dụ trong flashcard.
//
// Ưu điểm so với API TTS trả phí:
// - Miễn phí hoàn toàn
// - Không cần server call → latency thấp
// - Hỗ trợ đa ngôn ngữ
//
// Nhược điểm:
// - Chất lượng giọng phụ thuộc vào OS/browser
// - iOS Safari có một số hạn chế (cần user gesture)
//
// QUAN TRỌNG: SpeechSynthesis chỉ có trên browser (window object).
// Không gọi bất kỳ hàm nào trong file này ở Server Components.

/**
 * Kiểm tra browser có hỗ trợ Web Speech API không.
 * @returns {boolean}
 */
export function isTTSSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

// Biến toàn cục để cache (lưu trữ tạm) danh sách giọng đọc đã qua xử lý.
// Giúp hàm gọi lại lần 2 trở đi không phải filter & sort lại từ đầu.
let cachedVoices = null;

/**
 * Lấy danh sách giọng đọc tiếng Anh có sẵn trên thiết bị.
 * Tối ưu hóa: Ưu tiên các giọng đọc tự nhiên (Siri, Google, Premium) thay vì các giọng robotic cũ.
 *
 * @returns {SpeechSynthesisVoice[]} Danh sách giọng English
 */
export function getEnglishVoices() {
  if (!isTTSSupported()) return [];

  // Nếu đã cache và danh sách hợp lệ, trả về kết quả cache ngay lập tức -> O(1)
  if (cachedVoices && cachedVoices.length > 0) {
    return cachedVoices;
  }

  const voices = window.speechSynthesis.getVoices();
  
  // Trình duyệt (đặc biệt là Chrome) tải giọng đọc bất đồng bộ.
  // Lần đầu gọi có thể mảng rỗng, nên ta không cache nếu chưa tải xong.
  if (!voices || voices.length === 0) return [];

  const sortedVoices = voices
    .filter((v) => v.lang.startsWith("en"))
    .sort((a, b) => {
      // 1. Ưu tiên các giọng được đánh dấu là "Premium" (thường có trên iOS/macOS)
      const aIsPremium = a.name.includes("Premium") || a.name.includes("Enhanced");
      const bIsPremium = b.name.includes("Premium") || b.name.includes("Enhanced");
      if (aIsPremium && !bIsPremium) return -1;
      if (!aIsPremium && bIsPremium) return 1;

      // 2. Ưu tiên giọng "Google US English" (giọng natural của Chrome) hoặc "Samantha" / "Siri" (Apple)
      const premiumNames = ["Google", "Samantha", "Siri", "Daniel", "Karen", "Moira"];
      const aIsGood = premiumNames.some((name) => a.name.includes(name));
      const bIsGood = premiumNames.some((name) => b.name.includes(name));
      if (aIsGood && !bIsGood) return -1;
      if (!aIsGood && bIsGood) return 1;

      // 3. Phạt (đẩy xuống cuối) các giọng quá robotic (Microsoft mặc định)
      const badNames = ["David", "Zira", "Mark"];
      const aIsBad = badNames.some((name) => a.name.includes(name));
      const bIsBad = badNames.some((name) => b.name.includes(name));
      if (aIsBad && !bIsBad) return 1;
      if (!aIsBad && bIsBad) return -1;

      // 4. Ưu tiên en-US rồi đến en-GB
      if (a.lang === "en-US" && b.lang !== "en-US") return -1;
      if (b.lang === "en-US" && a.lang !== "en-US") return 1;
      if (a.lang === "en-GB" && b.lang !== "en-GB") return -1;
      if (b.lang === "en-GB" && a.lang !== "en-GB") return 1;
      
      return 0;
    });

  // Lưu lại vào bộ nhớ nếu đã lấy & sắp xếp thành công
  if (sortedVoices.length > 0) {
    cachedVoices = sortedVoices;
  }

  return sortedVoices;
}

/**
 * Phát âm một đoạn text bằng English voice.
 * Dừng bất kỳ utterance nào đang chạy trước khi phát.
 *
 * @param {string} text - Văn bản cần phát âm
 * @param {Object} options - Tuỳ chọn
 * @param {number} options.rate - Tốc độ đọc (0.5 - 2.0, mặc định 0.9)
 * @param {number} options.pitch - Cao độ (0 - 2, mặc định 1)
 * @param {Function} options.onStart - Callback khi bắt đầu phát
 * @param {Function} options.onEnd - Callback khi phát xong
 * @returns {boolean} true nếu bắt đầu phát thành công
 */
export function speak(text, { rate = 0.9, pitch = 1, onStart, onEnd } = {}) {
  if (!isTTSSupported() || !text) return false;

  // Dừng utterance đang chạy (tránh overlap)
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = rate;
  utterance.pitch = pitch;

  // Chọn giọng English tốt nhất có sẵn
  const voices = getEnglishVoices();
  if (voices.length > 0) {
    utterance.voice = voices[0];
  }

  if (onStart) utterance.onstart = onStart;
  if (onEnd) utterance.onend = onEnd;

  // onError: log nhưng không crash (TTS không phải tính năng critical)
  utterance.onerror = (e) => {
    // "interrupted" error xảy ra khi cancel() trước — là expected, không phải lỗi thật
    if (e.error !== "interrupted") {
      console.warn("[TTS] Speech error:", e.error);
    }
    onEnd?.();
  };

  window.speechSynthesis.speak(utterance);
  return true;
}

/**
 * Dừng phát âm đang chạy.
 */
export function stopSpeaking() {
  if (isTTSSupported()) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Kiểm tra xem đang phát âm không.
 * @returns {boolean}
 */
export function isSpeaking() {
  if (!isTTSSupported()) return false;
  return window.speechSynthesis.speaking;
}
