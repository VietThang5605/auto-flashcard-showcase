// --- lib/ai/openai.js ---
// OpenAI client wrapper cho tính năng phân tích từ vựng.
// Model: gpt-4o-mini — cân bằng tốt giữa chất lượng, tốc độ và chi phí.
//
// Chỉ dùng file này ở server-side (API Routes) để bảo vệ API key.
// KHÔNG import file này trong Client Components.

import OpenAI from "openai";
import { ANALYZE_SYSTEM_PROMPT, buildAnalyzePrompt } from "./prompts.js";

// Khởi tạo client một lần duy nhất (module-level singleton)
// API key đọc từ env variable — không bao giờ hardcode
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Phân tích từ vựng tiếng Anh bằng OpenAI GPT-4o-mini.
 * Trả về structured data để tạo flashcard.
 *
 * @param {string} word - Từ hoặc cụm từ cần phân tích
 * @param {string|null} context - Câu chứa từ (tuỳ chọn)
 * @returns {Promise<Object>} Parsed flashcard data object
 * @throws {Error} Nếu API call thất bại hoặc response không parse được
 */
export async function analyzeWithOpenAI(word, context = null) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: ANALYZE_SYSTEM_PROMPT },
      { role: "user", content: buildAnalyzePrompt(word, context) },
    ],
    // response_format: json_object đảm bảo model trả về JSON hợp lệ
    // Tránh trường hợp model thêm markdown code blocks hay text thừa
    response_format: { type: "json_object" },
    temperature: 0.3, // Thấp để output nhất quán, không quá sáng tạo
    max_tokens: 2000,  // Đủ cho toàn bộ flashcard data
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned empty response");
  }

  // Parse JSON — lỗi parse sẽ throw và được bắt ở route handler
  return JSON.parse(content);
}
