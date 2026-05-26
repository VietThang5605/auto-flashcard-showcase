"use client";

import { useEffect, useCallback } from "react";
import { syncService } from "@/lib/syncService";

export function SyncProvider({ children }) {

  const performSync = useCallback(async () => {
    try {
      if (typeof window !== "undefined" && navigator.onLine) {
        await syncService.sync();
      }
    } catch (err) {
      console.warn("Background Sync Failed:", err);
    }
  }, []);

  useEffect(() => {
    // Sync khi vừa mở app
    performSync();

    // Lắng nghe mạng trở lại để sync ngay
    window.addEventListener("online", performSync);

    // Sync tự động sau mỗi 5 phút
    const interval = setInterval(performSync, 5 * 60 * 1000);

    return () => {
      window.removeEventListener("online", performSync);
      clearInterval(interval);
    };
  }, [performSync]);

  return <>{children}</>;
}
