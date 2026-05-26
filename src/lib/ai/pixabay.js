// --- lib/ai/pixabay.js ---
// Tiện ích tìm kiếm hình ảnh minh họa từ Pixabay API.
// Yêu cầu: PIXABAY_API_KEY trong .env.local

/**
 * Tìm kiếm ảnh minh họa cho một từ khóa bằng Pixabay.
 * 
 * @param {string} query - Từ khóa tìm kiếm
 * @returns {Promise<string|null>} URL của ảnh hoặc null
 */
export async function searchPixabayImage(query) {
  const apiKey = process.env.PIXABAY_API_KEY;

  if (!apiKey) {
    console.warn("[Pixabay] Missing PIXABAY_API_KEY. Image search skipped.");
    return null;
  }

  if (!query) return null;

  try {
    // Pixabay API params:
    // - key: API key
    // - q: query
    // - image_type: photo (để lấy ảnh thực tế như Unsplash)
    // - orientation: horizontal
    // - safesearch: true
    const response = await fetch(
      `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&safesearch=true&per_page=3`
    );

    if (!response.ok) {
      console.error("[Pixabay] Search failed:", response.statusText);
      return null;
    }

    const data = await response.json();
    
    if (data.hits && data.hits.length > 0) {
      // webformatURL thường có độ phân giải đủ tốt (640px) cho mobile/web cards
      return data.hits[0].webformatURL;
    }

    return null;
  } catch (error) {
    console.error("[Pixabay] Error fetching from Pixabay:", error);
    return null;
  }
}
