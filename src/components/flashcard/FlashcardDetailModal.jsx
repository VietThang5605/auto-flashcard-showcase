"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { useFlashcard } from "@/hooks/useFlashcards";
import { FlashcardView } from "@/components/flashcard/FlashcardView";
import { Button } from "@/components/ui/button";

export function FlashcardDetailModal({ id, onClose }) {
  const { flashcard, isLoading, error } = useFlashcard(id);

  return (
    <AnimatePresence>
      {id && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none">
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.4, bounce: 0 }}
              className="w-full max-w-2xl max-h-full flex flex-col bg-card border border-border shadow-2xl rounded-2xl pointer-events-auto relative overflow-hidden"
            >
              {/* Header của Modal (Chứa nút X riêng biệt) */}
              <div className="flex items-center justify-end px-4 pt-4 sm:px-6 sm:pt-6 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Nội dung cuộn được */}
              <div className="p-4 sm:p-6 pt-2 sm:pt-2 overflow-y-auto flex-1">
                {isLoading ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Đang tải thẻ học...</p>
                  </div>
                ) : error ? (
                  <div className="py-20 text-center">
                    <p className="text-rose-500">Lỗi: {error}</p>
                    <Button onClick={onClose} variant="outline" className="mt-4">
                      Đóng
                    </Button>
                  </div>
                ) : flashcard ? (
                  <FlashcardView
                    data={flashcard}
                    provider={flashcard.ai_provider}
                    isViewOnly={true}
                    onClose={onClose}
                  />
                ) : null}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
