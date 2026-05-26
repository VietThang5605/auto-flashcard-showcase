// --- lib/ai/unsplash.js ---
// Tiện ích tìm kiếm hình ảnh minh họa từ Unsplash API.
// Yêu cầu: UNSPLASH_ACCESS_KEY trong .env.local

/**
 * Tìm kiếm ảnh minh họa cho một từ khóa.
 * 
 * @param {string} query - Từ khóa tìm kiếm (thường là gợi ý từ AI)
 * @returns {Promise<string|null>} URL của ảnh (bản regular) hoặc null nếu lỗi
 */
export async function searchUnsplashImage(query) {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;

  if (!accessKey) {
    console.warn("[Unsplash] Missing UNSPLASH_ACCESS_KEY. Image search skipped.");
    return null;
  }

  if (!query) return null;

  try {
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
      {
        headers: {
          Authorization: `Client-ID ${accessKey}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("[Unsplash] Search failed:", errorData);
      return null;
    }

    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      // Lấy ảnh bản regular để cân bằng giữa chất lượng và tốc độ tải
      return data.results[0].urls.regular;
    }

    return null;
  } catch (error) {
    console.error("[Unsplash] Error fetching image:", error);
    return null;
  }
}
