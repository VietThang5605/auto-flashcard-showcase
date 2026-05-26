import { defaultCache } from "@serwist/next/worker";
import { Serwist } from "serwist";

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

// ==========================================
// CƠ CHẾ PUSH NOTIFICATIONS
// ==========================================

self.addEventListener("push", (event) => {
  if (event.data) {
    const data = event.data.json();
    const title = data.title || "Auto Flashcard";
    const options = {
      body: data.body || "Đã đến giờ ôn tập từ vựng của bạn!",
      icon: "/icon-192x192.png",
      badge: "/icon-192x192.png", // Máy Android nhỏ
      vibrate: [200, 100, 200],
      data: {
        url: data.url || "/review", // URL để điều hướng khi user click
      },
      requireInteraction: true,
    };

    event.waitUntil(self.registration.showNotification(title, options));
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  
  // Lấy URL cần điều hướng
  const urlToOpen = event.notification.data?.url || "/review";

  // Mở tab hoặc focus vào tab đang mở
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      let matchingClient = null;
      
      for (let i = 0; i < windowClients.length; i++) {
        const windowClient = windowClients[i];
        if (windowClient.url.includes(urlToOpen)) {
          matchingClient = windowClient;
          break;
        }
      }

      if (matchingClient) {
        return matchingClient.focus();
      } else {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
