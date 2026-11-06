importScripts("./scramjet/scramjet.all.js");

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjetSW = new ScramjetServiceWorker();

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

async function handleRequest(event) {
  const url = new URL(event.request.url);

  if (url.pathname.includes("/scramjet/") || url.pathname.endsWith(".js") || url.pathname.endsWith(".wasm") || url.pathname === "/sw.js") {
    return await fetch(event.request);
  }

  await scramjetSW.loadConfig();
  if (scramjetSW.route(event)) { 
    return await scramjetSW.fetch(event); 
  }
  return await fetch(event.request);
}

self.addEventListener('fetch', (event) => { 
  event.respondWith(handleRequest(event)); 
});