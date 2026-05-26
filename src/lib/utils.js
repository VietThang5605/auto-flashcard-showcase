// --- utils.js ---
// Utility helper cho shadcn/ui.
// Hàm cn() kết hợp clsx và tailwind-merge để merge Tailwind classes an toàn.
// Tránh xung đột class như "text-red-500" bị override bởi "text-blue-500".

import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Kết hợp class names theo kiểu Tailwind-safe.
 * Ví dụ: cn("px-2 py-1", condition && "bg-red-500", "bg-blue-500")
 * → Kết quả: "px-2 py-1 bg-blue-500" (bg-red-500 bị override đúng cách)
 *
 * @param {...any} inputs - Class names hoặc conditional class objects
 * @returns {string} Merged class string
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
