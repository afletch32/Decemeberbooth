function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function pageNotFound() {
  return new Response("Event gallery not found.", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function onRequest({ request, params, env }) {
  const eventId = String(params && params.id || "").trim();
  const cloud = new URL(request.url).searchParams.get("c") || "";
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(eventId) || !/^[a-zA-Z0-9_-]{1,100}$/.test(cloud)) {
    return pageNotFound();
  }
  if (!env || !env.THEMES_KV) return pageNotFound();

  let stored;
  try {
    stored = JSON.parse(await env.THEMES_KV.get("events") || "{}");
  } catch (_) {
    return pageNotFound();
  }
  const events = Array.isArray(stored) ? stored : stored.events;
  const event = Array.isArray(events) ? events.find((item) => item && String(item.id) === eventId) : null;
  if (!event) return pageNotFound();

  const idSlug = slugify(eventId);
  const name = String(event.name || "Event");
  const date = String(event.date || "");
  const legacyTag = slugify(date ? `${name}-${date}` : name);
  const paramsOut = new URLSearchParams({
    cloud,
    tag: `event-${idSlug}`,
    legacyTag,
    title: date ? `${name} (${date})` : name,
    event: eventId,
    theme: String(event.themeKey || ""),
  });
  return Response.redirect(new URL(`/gallery.html?${paramsOut}`, request.url), 302);
}
