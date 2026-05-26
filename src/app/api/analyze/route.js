// --- app/api/analyze/route.js ---
// API Route xử lý yêu cầu phân tích từ vựng bằng AI.
// Đây là "cổng vào" duy nhất từ client để gọi AI — API keys không bao giờ lộ ra client.
//
// Flow:
// Client gửi POST { word, context?, provider } → Route chọn OpenAI/Gemini
// → Gọi AI → Parse JSON → Validate → Trả về cho client

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeWithOpenAI } from "@/lib/ai/openai";
import { analyzeWithGemini } from "@/lib/ai/gemini";
import { searchUnsplashImage } from "@/lib/ai/unsplash";
import { searchPixabayImage } from "@/lib/ai/pixabay";

/**
 * POST /api/analyze
 * Phân tích từ vựng bằng AI và trả về flashcard data.
 *
 * Request body:
 * - word: string (bắt buộc) — từ hoặc cụm từ cần phân tích
 * - context: string (tuỳ chọn) — câu chứa từ đó để AI hiểu đúng nghĩa
 * - provider: "openai" | "gemini" (tuỳ chọn, mặc định "openai")
 *
 * Response:
 * - 200: { data: FlashcardData }
 * - 400: { error: "validation error message" }
 * - 401: { error: "Unauthorized" }
 * - 500: { error: "AI analysis failed" }
 */
export async function POST(request) {
  // Bước 1: Kiểm tra authentication — chỉ user đã đăng nhập mới được dùng AI
  // Điều này ngăn abuse API key bởi người dùng không đăng nhập
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Bước 2: Parse và validate request body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { word, context, provider = "openai", imageProvider = "unsplash" } = body;

  // Validate: word là bắt buộc và không được quá dài
  if (!word || typeof word !== "string" || word.trim().length === 0) {
    return NextResponse.json(
      { error: "Từ/cụm từ không được để trống" },
      { status: 400 }
    );
  }

  if (word.trim().length > 200) {
    return NextResponse.json(
      { error: "Từ/cụm từ không được vượt quá 200 ký tự" },
      { status: 400 }
    );
  }

  if (!["openai", "gemini"].includes(provider)) {
    return NextResponse.json(
      { error: "Provider phải là 'openai' hoặc 'gemini'" },
      { status: 400 }
    );
  }

  // Bước 3: Gọi AI tương ứng với provider đã chọn
  const cleanWord = word.trim();
  const cleanContext = context?.trim() || null;

  try {
    let flashcardData;

    if (provider === "openai") {
      flashcardData = await analyzeWithOpenAI(cleanWord, cleanContext);
    } else {
      flashcardData = await analyzeWithGemini(cleanWord, cleanContext);
    }

    if (!flashcardData.word || !flashcardData.definition_en || !flashcardData.definition_vi) {
      throw new Error("AI response missing required fields");
    }

    // Bước 4.5: Tìm kiếm ảnh minh họa tự động
    // Sử dụng gợi ý từ AI (image_search_query) hoặc dùng chính từ khóa gốc
    const searchQuery = flashcardData.image_search_query || cleanWord;
    
    let imageUrl = null;
    if (imageProvider === "pixabay") {
      imageUrl = await searchPixabayImage(searchQuery);
    } else {
      imageUrl = await searchUnsplashImage(searchQuery);
    }
    
    // Gắn thêm field image_url vào dữ liệu trả về
    flashcardData.image_url = imageUrl;

    // Trả về data cho client kèm provider đã dùng
    return NextResponse.json({
      data: flashcardData,
      provider,
      image_source: imageProvider
    });

  } catch (error) {
    // Log lỗi server-side để debug, nhưng không expose chi tiết lỗi ra client
    console.error(`[analyze] AI error (provider: ${provider}):`, error.message);

    // Phân loại lỗi để trả về message phù hợp cho user
    if (error.message?.includes("rate limit") || error.status === 429) {
      return NextResponse.json(
        { error: "AI đang bận, vui lòng thử lại sau vài giây" },
        { status: 429 }
      );
    }

    if (error.message?.includes("API key") || error.status === 401) {
      return NextResponse.json(
        { error: "Lỗi cấu hình AI. Vui lòng liên hệ admin." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Phân tích thất bại. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}
