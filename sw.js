importScripts("scramjet/scramjet.all.js");

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjetSW = new ScramjetServiceWorker();

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.startsWith("/scramjet/") || url.pathname.endsWith(".js") || url.pathname.endsWith(".wasm") || url.pathname === "/sw.js") {
    return;
  }

  event.respondWith(
    (async () => {
      await scramjetSW.loadConfig();
      if (scramjetSW.route(event)) {
        return await scramjetSW.fetch(event);
      }
      return await fetch(event.request);
    })()
  );
});