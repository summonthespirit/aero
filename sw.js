importScripts("/scramjet/scramjet.all.js");

const scramjet = new ScramjetServiceWorker({
  prefix: "/scramjet/",
  files: {
    wasm: "/scramjet/wasm.wasm",
    all: "/scramjet/scramjet.all.js",
    sync: "/scramjet/scramjet.sync.js"
  }
});

self.addEventListener("fetch", (event) => {
  if (scramjet.route(event)) {
    event.respondWith(scramjet.fetch(event));
  }
});