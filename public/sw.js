const CACHE = "nova-v3";

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(["/"]))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  if (e.request.url.includes("functions.poehali.dev")) return;
  if (e.request.url.includes("fonts.googleapis.com")) return;

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || fetch(e.request)))
  );
});

// ── Push уведомления ──────────────────────────────────────────────────────────
self.addEventListener("push", (e) => {
  if (!e.data) return;
  let data = {};
  try { data = JSON.parse(e.data.text()); } catch { data = { title: "Nova", body: e.data.text() }; }

  const isCall = data.is_call === true;

  const options = isCall ? {
    body: data.body || "Входящий звонок",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    vibrate: [500, 200, 500, 200, 500, 200, 500],
    tag: data.tag || "call",
    requireInteraction: true,
    data: { call_id: data.call_id, is_call: true, url: "/" },
    actions: [
      { action: "answer", title: "✅ Ответить" },
      { action: "decline", title: "❌ Отклонить" },
    ],
  } : {
    body: data.body || "Новое сообщение",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    vibrate: [200, 100, 200],
    tag: data.tag || `msg_${data.chat_id}`,
    data: { chat_id: data.chat_id, url: "/" },
    actions: [{ action: "open", title: "Открыть" }],
  };

  e.waitUntil(
    self.registration.showNotification(data.title || "Nova", options)
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const notifData = e.notification.data || {};

  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const targetUrl = "/";

      // Отклонить звонок — просто закрываем уведомление
      if (e.action === "decline") return;

      // Найти открытое окно и передать сообщение
      for (const client of list) {
        if (client.url.includes(self.location.origin)) {
          if (notifData.is_call) {
            client.postMessage({ type: "incoming_call", call_id: notifData.call_id });
          }
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});