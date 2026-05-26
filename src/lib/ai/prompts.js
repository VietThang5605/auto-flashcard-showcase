// --- lib/ai/prompts.js ---
// Prompt templates chung cho cả OpenAI và Gemini.
// Tách prompt ra file riêng để:
// 1. Dễ điều chỉnh output mà không chạm vào business logic
// 2. Đảm bảo cả 2 model trả về cùng JSON schema
// 3. Dễ A/B test các prompt version khác nhau

/**
 * Tạo system prompt cho AI phân tích từ vựng tiếng Anh.
 * System prompt định nghĩa "người AI là ai" — language learning assistant.
 */
export const ANALYZE_SYSTEM_PROMPT = `You are an expert English language learning assistant specialized in creating comprehensive flashcard content for Vietnamese learners.

Your task is to analyze English words or phrases and return structured JSON data for flashcard creation.

RULES:
- Always respond with valid JSON only — no markdown, no explanations outside JSON
- IPA phonetic transcription must be accurate (use standard American English pronunciation)
- Vietnamese translations must be natural and contextually appropriate
- Examples must be practical, common sentences (not overly formal or academic unless word requires it)
- Quiz questions must test genuine understanding, not just memorization
- If a context sentence is provided, use it to determine the correct meaning/usage`;

/**
 * Tạo user prompt với từ cần phân tích và ngữ cảnh tuỳ chọn.
 *
 * @param {string} word - Từ hoặc cụm từ cần phân tích
 * @param {string|null} context - Câu chứa từ đó (tuỳ chọn, giúp AI hiểu đúng nghĩa)
 * @returns {string} User prompt hoàn chỉnh
 */
export function buildAnalyzePrompt(word, context = null) {
  const contextClause = context
    ? `\nContext sentence (use this to determine the correct meaning): "${context}"`
    : "";

  return `Analyze the English word/phrase: "${word}"${contextClause}

Return ONLY a valid JSON object with this exact structure:
{
  "word": "the word or phrase as given",
  "phonetic": "/IPA transcription/",
  "word_type": "noun/verb/adjective/adverb/phrase/idiom/etc",
  "meaning_vi": "Nghĩa tiếng Việt ngắn gọn, 1-3 từ (VD: 'con mèo', 'chạy nhanh', 'đẹp'). Không viết câu dài.",
  "definition_en": "Clear, concise English definition (1-2 sentences)",
  "definition_vi": "Định nghĩa tiếng Việt rõ ràng, ngắn gọn",
  "explanation_en": "Detailed English explanation with usage notes, nuances, or common mistakes",
  "explanation_vi": "Giải thích chi tiết bằng tiếng Việt, bao gồm cách dùng và lưu ý",
  "examples": [
    {"en": "Natural example sentence using the word", "vi": "Dịch nghĩa câu ví dụ"},
    {"en": "Another example with different context", "vi": "Dịch nghĩa câu ví dụ khác"},
    {"en": "Third example sentence", "vi": "Dịch nghĩa câu thứ ba"}
  ],
  "synonyms": ["synonym1", "synonym2", "synonym3"],
  "antonyms": ["antonym1", "antonym2"],
  "related_words": ["related1", "related2", "related3"],
  "image_search_query": "1-4 specific English keywords that describe a visual scene representing the word's meaning in this context. Prefer concrete objects/actions over abstract words (e.g., 'man meditating' instead of 'tranquility')",
  "quiz_questions": [
    {
      "type": "multiple_choice",
      "question": "A question testing the understanding of the word (e.g., What does 'sustain' most likely mean in the context of environment?)",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "Option A",
      "explanation": "Brief explanation of why this answer is correct"
    },
    {
      "type": "multiple_choice",
      "question": "A sentence with a '_____' (exactly 5 underscores) for the word to be filled in. E.g., 'He felt very _____ after the long hike.'",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "Option A",
      "explanation": "Brief explanation"
    }
  ]
}

Provide 3-5 examples, 2-4 synonyms/antonyms, 2-3 related words, and exactly 2 multiple_choice quiz questions.
- Q1: Should test the meaning or usage in a general sense.
- Q2: MUST be a fill-in-the-blank style using '_____' placeholder.
If synonyms/antonyms don't apply, use empty arrays [].
meaning_vi must be SHORT (1-3 words max).
Final options should be plausible distractors.`;
}
