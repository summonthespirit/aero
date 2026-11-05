importScripts("/scramjet/scramjet.all.js");

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjetSW = new ScramjetServiceWorker();

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

async function handleRequest(event) {
  await scramjetSW.loadConfig();
  if (scramjetSW.route(event)) { 
    return await scramjetSW.fetch(event); 
  }
  return await fetch(event.request);
}

self.addEventListener('fetch', (event) => { 
  event.respondWith(handleRequest(event)); 
});