function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function page(body, status = 200) {
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DecemberBooth photo</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f7fb;color:#162033;font:16px system-ui,sans-serif;text-align:center}main{width:min(92vw,720px);padding:28px}img,video{max-width:100%;max-height:78vh;border-radius:16px;box-shadow:0 12px 36px #17233a22}a{display:inline-block;margin-top:18px;padding:12px 18px;border-radius:999px;background:#162033;color:white;text-decoration:none}</style></head><body><main>${body}</main></body></html>`, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

export async function onRequest(context) {
  const id = String(context.params && context.params.id || "").trim();
  if (!id || !context.env || !context.env.THEMES_KV) return page("<h1>Photo unavailable</h1><p>This share link is not configured.</p>", 404);
  const raw = await context.env.THEMES_KV.get(`share:${id}`);
  if (!raw) return page("<h1>Your photo is saved</h1><p>Please check back later. The booth is still finishing the upload.</p>");
  let item;
  try { item = JSON.parse(raw); } catch (_) { item = null; }
  const url = String(item && item.secure_url || "").trim();
  if (!/^https:\/\//i.test(url)) return page("<h1>Photo unavailable</h1><p>Please try this link again later.</p>", 404);
  const safeUrl = escapeHtml(url);
  const media = item.resource_type === "video"
    ? `<video controls playsinline src="${safeUrl}"></video>`
    : `<img src="${safeUrl}" alt="Your DecemberBooth photo">`;
  return page(`<h1>Your photo is ready</h1>${media}<br><a href="${safeUrl}" download>Download photo</a>`);
}
