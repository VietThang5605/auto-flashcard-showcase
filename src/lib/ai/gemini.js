// --- lib/ai/gemini.js ---
// Google Gemini client wrapper cho tính năng phân tích từ vựng.
// Model: gemini-2.5-flash-lite — nhanh, rẻ, chất lượng tốt cho task này.
//
// Chỉ dùng file này ở server-side (API Routes) để bảo vệ API key.
// KHÔNG import file này trong Client Components.

import { GoogleGenAI } from "@google/genai";
import { ANALYZE_SYSTEM_PROMPT, buildAnalyzePrompt } from "./prompts.js";

// Khởi tạo Gemini client với API key từ environment variable
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

/**
 * Phân tích từ vựng tiếng Anh bằng Google Gemini 2.5 Flash Lite.
 * Trả về structured data để tạo flashcard.
 *
 * @param {string} word - Từ hoặc cụm từ cần phân tích
 * @param {string|null} context - Câu chứa từ (tuỳ chọn)
 * @returns {Promise<Object>} Parsed flashcard data object
 * @throws {Error} Nếu API call thất bại hoặc response không parse được
 */
export async function analyzeWithGemini(word, context = null) {
  // Ghép system prompt + user prompt thành một message duy nhất
  // Gemini 2.5 flash lite xử lý tốt với combined prompt này
  const fullPrompt = `${ANALYZE_SYSTEM_PROMPT}\n\n${buildAnalyzePrompt(word, context)}`;

  const response = await genAI.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents: fullPrompt,
    config: {
      // Yêu cầu Gemini trả về JSON hợp lệ
      // responseMimeType: json đảm bảo không có text thừa ngoài JSON
      responseMimeType: "application/json",
      temperature: 0.3, // Nhất quán, không quá sáng tạo
      maxOutputTokens: 2000,
    },
  });

  const content = response.text;
  if (!content) {
    throw new Error("Gemini returned empty response");
  }

  // Parse JSON — Gemini với responseMimeType json thường trả về JSON sạch
  // Nhưng vẫn cần parse để validate và trả về object
  return JSON.parse(content);
}
