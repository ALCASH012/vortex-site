"use strict";

const VORTEX_PWA_CACHE = "vortex-pwa-static-v1";
const VORTEX_PWA_BASE = new URL("/vortex-site/", self.location.origin);
const VORTEX_PWA_INDEX = new URL("index.html", VORTEX_PWA_BASE).href;
const VORTEX_PWA_STATIC = /\.(?:css|js|webmanifest|png|jpe?g|svg|ico|woff2?)$/i;

self.addEventListener("install", event => {
  event.waitUntil(caches.open(VORTEX_PWA_CACHE).then(cache => cache.addAll([
    VORTEX_PWA_INDEX,
    new URL("manifest.webmanifest", VORTEX_PWA_BASE).href,
    new URL("icons/vortex-192.png", VORTEX_PWA_BASE).href,
    new URL("icons/vortex-512.png", VORTEX_PWA_BASE).href,
    new URL("vortex-logo.jpg", VORTEX_PWA_BASE).href
  ])));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys
      .filter(key => key.startsWith("vortex-pwa-static-") && key !== VORTEX_PWA_CACHE)
      .map(key => caches.delete(key))
  )));
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin
      || !url.pathname.startsWith(VORTEX_PWA_BASE.pathname)) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(async () =>
      (await caches.match(VORTEX_PWA_INDEX)) || Response.error()
    ));
    return;
  }

  if (!VORTEX_PWA_STATIC.test(url.pathname)
      || [...url.searchParams.keys()].some(key => key !== "v")) return;

  const cacheKey = new Request(`${url.origin}${url.pathname}`);
  event.respondWith((async () => {
    const cache = await caches.open(VORTEX_PWA_CACHE);
    try {
      const response = await fetch(request);
      if (response.ok && response.type === "basic") {
        await cache.put(cacheKey, response.clone());
      }
      return response;
    } catch {
      return (await cache.match(cacheKey)) || Response.error();
    }
  })());
});
