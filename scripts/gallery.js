(function () {
  const params = new URLSearchParams(window.location.search);
  const get = (name) => params.get(name) || "";
  const tag = get("tag");
  const legacyTag = get("legacyTag");
  const cloud = get("cloud");
  const requestedTitle = get("title");
  const pageSize = 24;
  let resources = [];
  let rendered = 0;
  let activeIndex = -1;
  let loading = false;
  const $ = (id) => document.getElementById(id);
  const grid = $("galleryGrid");

  function setText(id, value) { if ($(id) && value) $(id).textContent = value; }
  function applyTheme(theme, event) {
    const source = event || theme || {};
    const base = theme || {};
    const accent = source.accent || source.primaryColor || base.accent || base.primaryColor;
    const background = source.backgroundColor || base.backgroundColor;
    const heading = source.fontHeading || source.headingFont || base.fontHeading || base.headingFont;
    const body = source.fontBody || source.bodyFont || base.fontBody || base.bodyFont;
    if (accent) document.documentElement.style.setProperty("--accent", accent);
    if (background) document.documentElement.style.setProperty("--hero-bg", background);
    if (heading) document.documentElement.style.setProperty("--heading", heading);
    if (body) document.documentElement.style.setProperty("--body", body);
    const logo = source.logo || base.logo;
    if (logo) { $("galleryLogo").src = logo; $("galleryLogo").classList.add("visible"); }
  }
  function findTheme(themes, key) {
    if (!themes || !key) return null;
    if (themes[key]) return themes[key];
    return String(key).split(":").reduce((value, part) => value && value[part], themes) || null;
  }
  function resourceUrl(item) { return String((item && (item.secure_url || item.url)) || ""); }
  function isVideo(item) { return item && (item.resource_type === "video" || item.type === "video"); }
  function photoShareUrl(item) {
    const captureId = item && (item.capture_id || item.captureId);
    return captureId ? new URL(`/share/${encodeURIComponent(captureId)}`, window.location.origin).href : resourceUrl(item);
  }
  async function shareUrl(url, title) {
    if (navigator.share) {
      try { await navigator.share({ title, url }); return; } catch (error) { if (error && error.name === "AbortError") return; }
    }
    try {
      await navigator.clipboard.writeText(url);
      setText("viewerHint", "Link copied");
    } catch (_) {
      window.prompt("Copy this link to share", url);
    }
  }
  function resetGrid() {
    grid.replaceChildren();
    for (let index = 0; index < 4; index += 1) {
      const skeleton = document.createElement("div");
      skeleton.className = "skeleton";
      skeleton.setAttribute("aria-hidden", "true");
      grid.appendChild(skeleton);
    }
    grid.setAttribute("aria-busy", "true");
    $("emptyState").hidden = true;
    $("errorState").hidden = true;
  }
  function makeCard(item, index) {
    const card = document.createElement("button"); card.type = "button"; card.className = "card"; card.dataset.index = index;
    const media = document.createElement(isVideo(item) ? "video" : "img"); media.src = resourceUrl(item); media.loading = "lazy";
    if (isVideo(item)) { media.muted = true; media.playsInline = true; media.preload = "metadata"; media.controls = false; }
    else media.alt = `Event photo ${index + 1}`;
    card.appendChild(media);
    const caption = document.createElement("span"); caption.className = "card-caption";
    caption.textContent = `${isVideo(item) ? "Video" : "Photo"} ${index + 1}`;
    card.appendChild(caption); card.addEventListener("click", () => openViewer(index)); return card;
  }
  function renderMore() {
    if (rendered === 0) grid.replaceChildren();
    const end = Math.min(rendered + pageSize, resources.length);
    resources.slice(rendered, end).forEach((item, offset) => grid.appendChild(makeCard(item, rendered + offset)));
    rendered = end; grid.setAttribute("aria-busy", "false");
    $("loadMore").style.display = rendered < resources.length ? "block" : "none";
  }
  function openViewer(index) {
    if (!resources[index]) return; activeIndex = index; const item = resources[index]; const media = document.createElement(isVideo(item) ? "video" : "img");
    media.src = resourceUrl(item); media.alt = `Event photo ${index + 1}`; media.controls = isVideo(item); media.autoplay = isVideo(item); media.playsInline = true;
    $("viewerMedia").replaceChildren(media); $("viewerCount").textContent = `${index + 1} of ${resources.length}`;
    $("downloadPhotoButton").href = resourceUrl(item); $("downloadPhotoButton").download = `event-${isVideo(item) ? "video" : "photo"}-${index + 1}.${isVideo(item) ? "mp4" : "jpg"}`;
    $("viewerHint").textContent = isVideo(item) ? "Video" : "Full size";
    $("viewer").classList.add("open"); $("viewer").setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden";
  }
  function closeViewer() { $("viewer").classList.remove("open"); $("viewer").setAttribute("aria-hidden", "true"); $("viewerMedia").replaceChildren(); document.body.style.overflow = ""; }
  function moveViewer(delta) { if (resources.length) openViewer((activeIndex + delta + resources.length) % resources.length); }
  function normalize(data) { return Array.isArray(data && data.resources) ? data.resources.filter((item) => resourceUrl(item)) : []; }
  async function readGallery() {
    const tags = [tag, legacyTag].filter((value, index, list) => value && list.indexOf(value) === index);
    const responses = await Promise.all(tags.map((value) => fetch(`/api/gallery?tag=${encodeURIComponent(value)}`, { cache: "no-store" })));
    if (!responses.some((response) => response.ok)) throw new Error("Gallery index unavailable");
    const payloads = await Promise.all(responses.map((response) => response.ok ? response.json() : null));
    const seen = new Set();
    return { title: payloads.find((payload) => payload && payload.title)?.title || "", resources: payloads.flatMap((payload) => normalize(payload)).filter((item) => { const key = resourceUrl(item); if (seen.has(key)) return false; seen.add(key); return true; }) };
  }
  async function readTheme() {
    const eventId = get("event"); const themeKey = get("theme");
    const [eventsResponse, themesResponse] = await Promise.all([
      eventId ? fetch("/api/events", { cache: "no-store" }) : Promise.resolve(null),
      themeKey ? fetch("/api/themes", { cache: "no-store" }) : Promise.resolve(null),
    ]);
    const events = eventsResponse && eventsResponse.ok ? await eventsResponse.json() : null;
    const themes = themesResponse && themesResponse.ok ? await themesResponse.json() : null;
    const event = events && Array.isArray(events.events) ? events.events.find((item) => item && item.id === eventId) : null;
    const theme = findTheme(themes, themeKey);
    applyTheme(theme, event); return { event, theme };
  }
  async function init() {
    if (loading) return;
    if (!tag) { setText("gallerySubtitle", "This link is missing the gallery tag needed to load photos."); $("errorState").hidden = false; grid.replaceChildren(); grid.setAttribute("aria-busy", "false"); return; }
    loading = true; resetGrid();
    if (requestedTitle) setText("galleryTitle", requestedTitle);
    try {
      const [gallery, style] = await Promise.all([readGallery(), readTheme()]);
      const title = gallery.title || (style.event && style.event.name) || requestedTitle;
      if (title) {
        setText("galleryTitle", title);
        document.title = `${title} | Event Gallery`;
        document.querySelector('meta[name="description"]').content = `Browse and download photos from ${title}.`;
      }
      if (style.event && style.event.date) setText("gallerySubtitle", `Photos from ${style.event.date}`);
      resources = normalize(gallery);
      if (!resources.length && cloud) { const fallback = await fetch(`https://res.cloudinary.com/${encodeURIComponent(cloud)}/image/list/${encodeURIComponent(tag)}.json`, { cache: "no-store" }); if (fallback.ok) resources = normalize(await fallback.json()); }
      if (!resources.length) { setText("gallerySubtitle", "Your event moments will appear here."); $("emptyState").hidden = false; grid.replaceChildren(); grid.setAttribute("aria-busy", "false"); return; }
      const date = style.event && style.event.date;
      setText("gallerySubtitle", date ? `Photos from ${date}` : "A collection of moments from this event");
      setText("photoCount", `${resources.length} ${resources.length === 1 ? "photo" : "photos"}`);
      $("galleryMeta").hidden = false; renderMore();
    } catch (error) {
      setText("gallerySubtitle", "Your photos are just out of reach."); $("errorState").hidden = false; grid.replaceChildren(); grid.setAttribute("aria-busy", "false"); console.warn(error);
    } finally { loading = false; }
  }
  $("loadMore").addEventListener("click", renderMore); $("retryButton").addEventListener("click", init);
  $("shareGalleryButton").addEventListener("click", () => shareUrl(window.location.href, $("galleryTitle").textContent));
  $("sharePhotoButton").addEventListener("click", () => { if (resources[activeIndex]) shareUrl(photoShareUrl(resources[activeIndex]), $("galleryTitle").textContent); });
  $("viewerClose").addEventListener("click", closeViewer); $("viewerPrev").addEventListener("click", () => moveViewer(-1)); $("viewerNext").addEventListener("click", () => moveViewer(1));
  $("viewer").addEventListener("click", (event) => { if (event.target === $("viewer")) closeViewer(); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeViewer(); if (event.key === "ArrowLeft") moveViewer(-1); if (event.key === "ArrowRight") moveViewer(1); });
  init();
})();
