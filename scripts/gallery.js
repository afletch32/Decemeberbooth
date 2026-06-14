(function () {
  function getParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name) || "";
  }

  const cloud = getParam("cloud");
  const tag = getParam("tag");
  const title = getParam("title");

  const titleEl = document.getElementById("galleryTitle");
  const statusEl = document.getElementById("status");
  const grid = document.getElementById("galleryGrid");
  const emptyState = document.getElementById("emptyState");
  const errorState = document.getElementById("errorState");

  if (titleEl && title) titleEl.textContent = title;

  if (!tag) {
    statusEl.textContent = "Missing gallery tag in the link.";
    errorState.style.display = "block";
    errorState.textContent = "This link is missing the gallery tag needed to load photos.";
    return;
  }

  const listUrl = cloud
    ? `https://res.cloudinary.com/${encodeURIComponent(cloud)}/image/list/${encodeURIComponent(tag)}.json`
    : "";

  function renderResources(resources) {
    if (!resources.length) {
      statusEl.textContent = "No photos found yet.";
      emptyState.style.display = "block";
      return;
    }
    statusEl.textContent = `${resources.length} photo${resources.length === 1 ? "" : "s"}`;
    resources.forEach((item) => {
      const url = item.secure_url || item.url;
      if (!url) return;
      const resourceType =
        item.resource_type === "video" ||
        item.type === "video" ||
        /\.(webm|mp4|mov)(\?|#|$)/i.test(url)
          ? "video"
          : "image";
      const card = document.createElement("div");
      card.className = "card";
      if (resourceType === "video") {
        const video = document.createElement("video");
        video.src = url;
        video.controls = true;
        video.muted = true;
        video.playsInline = true;
        video.preload = "metadata";
        card.appendChild(video);
      } else {
        const img = document.createElement("img");
        img.src = url;
        img.loading = "lazy";
        card.appendChild(img);
      }
      grid.appendChild(card);
    });
  }

  function readAppGallery() {
    const appUrl = `/api/gallery?tag=${encodeURIComponent(tag)}`;
    return fetch(appUrl, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("App gallery index not available.");
        return res.json();
      })
      .then((data) => ((data && data.resources) ? data.resources : []));
  }

  function readCloudinaryList() {
    if (!listUrl) return Promise.resolve([]);
    return fetch(listUrl, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Cloudinary list not available.");
        return res.json();
      })
      .then((data) => {
        return (data && data.resources) ? data.resources : [];
      });
  }

  readAppGallery()
    .then((resources) => {
      if (resources.length) {
        renderResources(resources);
        return null;
      }
      return readCloudinaryList().then((cloudinaryResources) => {
        renderResources(cloudinaryResources);
        return null;
      });
    })
    .catch((err) => {
      statusEl.textContent = "Unable to load photos.";
      errorState.style.display = "block";
      errorState.textContent =
        "No app gallery index is available yet, and Cloudinary tag-based image list is not enabled.";
      console.warn(err);
    });
})();
