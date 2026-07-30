// Bump these to force one-time invalidation when changing strategies.
const APP_SHELL_CACHE = "pb-app-shell-v1";
const RUNTIME_CACHE = "pb-runtime-v4";
const SHARE_CACHE = "pb-share-v1";
const OFFLINE_ASSETS_CACHE = "pb-offline-assets-v1";

// These files are the booth itself. Event artwork remains on-demand so a new
// install stays small; it is cached while used or through Make Available Offline.
const APP_SHELL_ASSETS = [
  "",
  "index.html",
  "manifest.json",
  "appicon.png",
  "fonts.css",
  "final-preview-sizing-fix.css",
  "scripts/app.js",
  "scripts/canvas-utils.mjs",
  "scripts/cloudinary-utils.mjs",
  "scripts/camera-utils.mjs",
  "scripts/event-utils.mjs",
  "scripts/template-text-utils.mjs",
  "scripts/remote-sync-utils.mjs",
  "scripts/theme-admin-state.mjs",
  "scripts/asset-library-utils.mjs",
  "scripts/asset-library-view.mjs",
  "scripts/external-library-loader.mjs",
  "scripts/media-preview-utils.mjs",
  "scripts/recording-utils.mjs",
  "scripts/theme-sound-utils.mjs",
  "scripts/beauty/presets.mjs",
];

// Always take control ASAP, then keep a complete, lightweight app shell ready.
self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(APP_SHELL_CACHE);
    const urls = APP_SHELL_ASSETS.map(
      (path) => new URL(path, self.registration.scope).href
    );
    // A missing optional file must not prevent the booth from installing.
    await Promise.all(urls.map(async (url) => {
      try {
        const response = await fetch(url, { cache: "reload" });
        if (response.ok) await cache.put(url, response);
      } catch (_) {
        // A later update will retry after the connection recovers.
      }
    }));
  })());
  self.skipWaiting();
});

// On activate, clean up old caches and claim clients.
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    try {
      const keep = new Set([
        APP_SHELL_CACHE,
        RUNTIME_CACHE,
        SHARE_CACHE,
        OFFLINE_ASSETS_CACHE,
      ]);
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => !keep.has(key)).map((key) => caches.delete(key)));
    } catch (_) {
      // noop
    }
    await self.clients.claim();
  })());
});

// Works at domain root or subpaths (e.g., "/").
function scopePath() {
  return new URL("./", self.registration.scope).pathname;
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const base = scopePath();
  const sameOrigin = url.origin === self.location.origin;

  // Serve share images from cache at {scope}/share/{id}.png.
  if (sameOrigin && url.pathname.startsWith(`${base}share/`)) {
    event.respondWith(
      caches.open(SHARE_CACHE).then(async (cache) => {
        const response = await cache.match(event.request);
        return response || new Response("Not found", { status: 404 });
      }),
    );
    return;
  }

  const isAppShellRequest =
    sameOrigin &&
    event.request.method === "GET" &&
    (event.request.mode === "navigate" ||
      event.request.destination === "script" ||
      event.request.destination === "style" ||
      event.request.destination === "font" ||
      url.pathname === `${base}manifest.json` ||
      url.pathname === `${base}appicon.png`);

  if (isAppShellRequest) {
    event.respondWith((async () => {
      const cache = await caches.open(APP_SHELL_CACHE);
      const cached = await cache.match(event.request);
      if (cached) {
        const refresh = fetch(event.request)
          .then((response) => {
            if (response && response.ok) return cache.put(event.request, response.clone());
            return undefined;
          })
          .catch(() => undefined);
        event.waitUntil(refresh);
        return cached;
      }
      const response = await fetch(event.request);
      if (response && response.ok) await cache.put(event.request, response.clone());
      return response;
    })());
    return;
  }

  // Cache artwork from either the Pages domain or Cloudinary. This includes
  // CSS background images, <img> screens, and looping guest-screen video.
  const isAssetRequest =
    event.request.method === "GET" &&
    (event.request.destination === "image" ||
      event.request.destination === "video" ||
      event.request.destination === "audio" ||
      (sameOrigin && url.pathname.includes("/assets/")) ||
      /\.(png|jpg|jpeg|gif|webp|svg|mp4|webm|mp3|wav|m4a|aac|ogg|oga)$/i.test(
        url.pathname
      ));

  if (isAssetRequest) {
    event.respondWith((async () => {
      const [offlineCache, runtimeCache] = await Promise.all([
        caches.open(OFFLINE_ASSETS_CACHE),
        caches.open(RUNTIME_CACHE),
      ]);
      const cached =
        (await offlineCache.match(event.request)) ||
        (await runtimeCache.match(event.request));
      if (cached) {
        const refresh = fetch(event.request)
          .then(async (response) => {
            // Cross-origin Cloudinary responses can be opaque but are still safe
            // to cache and make the selected screen dependable next launch.
            if (response && (response.ok || response.type === "opaque")) {
              await runtimeCache.put(event.request, response.clone());
            }
          })
          .catch(() => undefined);
        event.waitUntil(refresh);
        return cached;
      }
      try {
        const response = await fetch(event.request);
        if (response && (response.ok || response.type === "opaque")) {
          await runtimeCache.put(event.request, response.clone());
        }
        return response;
      } catch (_) {
        return new Response("Offline", { status: 503 });
      }
    })());
  }
});

// Receive image buffer and store as {scope}/share/{id}.png; reply with URL.
self.addEventListener("message", async (event) => {
  const data = event.data || {};
  if (data.type !== "store-share") return;

  try {
    const { id, buffer, mime } = data;
    const path = `${scopePath()}share/${id}.png`;
    const request = new Request(path, { method: "GET" });
    const blob = new Blob([buffer], { type: mime || "image/png" });
    const response = new Response(blob, {
      headers: { "Content-Type": blob.type, "Cache-Control": "public, max-age=31536000" },
    });
    const cache = await caches.open(SHARE_CACHE);
    await cache.put(request, response);
    event.ports?.[0]?.postMessage({ ok: true, url: path });
  } catch (error) {
    event.ports?.[0]?.postMessage({ ok: false, error: String(error) });
  }
});
