// --- components/flashcard/AIAnalyzing.jsx ---
// Component hiển thị trạng thái loading khi AI đang phân tích từ vựng.
// Sử dụng shadcn Skeleton + stagger animation để tạo cảm giác "đang làm việc".
//
// Props:
// - provider: "openai" | "gemini" — hiển thị tên AI đang dùng

"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

// Cấu hình stagger animation — các skeleton xuất hiện lần lượt
// tạo cảm giác AI đang "điền dần" thông tin
const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1, // Mỗi skeleton xuất hiện cách nhau 100ms
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 },
  },
};

export function AIAnalyzing({ provider = "openai" }) {
  const providerLabel = provider === "openai" ? "OpenAI GPT-4o" : "Gemini Flash";

  return (
    <motion.div
      className="w-full space-y-6 p-6 rounded-2xl border bg-card"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Header — cho biết AI nào đang xử lý */}
      <motion.div variants={itemVariants} className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          {/* Icon xoay vòng để thể hiện AI đang hoạt động */}
          <Sparkles className="w-5 h-5 text-primary animate-pulse" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            {providerLabel} đang phân tích...
          </p>
          <p className="text-xs text-muted-foreground">
            Thường mất 3–8 giây
          </p>
        </div>
      </motion.div>

      {/* Skeleton cho từ + phonetic */}
      <motion.div variants={itemVariants} className="space-y-2">
        <Skeleton className="h-9 w-48 shimmer" />
        <Skeleton className="h-5 w-32 shimmer" />
      </motion.div>

      {/* Skeleton cho definitions */}
      <motion.div variants={itemVariants} className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-full shimmer" />
        <Skeleton className="h-5 w-3/4 shimmer" />
      </motion.div>

      {/* Skeleton cho explanation */}
      <motion.div variants={itemVariants} className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-full shimmer" />
        <Skeleton className="h-4 w-full shimmer" />
        <Skeleton className="h-4 w-2/3 shimmer" />
      </motion.div>

      {/* Skeleton cho examples */}
      <motion.div variants={itemVariants} className="space-y-3">
        <Skeleton className="h-4 w-20" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-4 w-full shimmer" />
            <Skeleton className="h-4 w-4/5 shimmer" />
          </div>
        ))}
      </motion.div>

      {/* Skeleton cho synonyms/antonyms */}
      <motion.div variants={itemVariants} className="flex gap-2 flex-wrap">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-6 w-20 rounded-full shimmer" />
        ))}
      </motion.div>
    </motion.div>
  );
}
