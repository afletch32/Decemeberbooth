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

  if (!cloud || !tag) {
    statusEl.textContent = "Missing Cloudinary details in the link.";
    errorState.style.display = "block";
    errorState.textContent = "This link is missing the Cloudinary info needed to load photos.";
    return;
  }

  const listUrl = `https://res.cloudinary.com/${encodeURIComponent(cloud)}/image/list/${encodeURIComponent(tag)}.json`;

  fetch(listUrl, { cache: "no-store" })
    .then((res) => {
      if (!res.ok) throw new Error("Cloudinary list not available.");
      return res.json();
    })
    .then((data) => {
      const resources = (data && data.resources) ? data.resources : [];
      if (!resources.length) {
        statusEl.textContent = "No photos found yet.";
        emptyState.style.display = "block";
        return;
      }
      statusEl.textContent = `${resources.length} photo${resources.length === 1 ? "" : "s"}`;
      resources.forEach((item) => {
        const url = item.secure_url || item.url;
        if (!url) return;
        const card = document.createElement("div");
        card.className = "card";
        const img = document.createElement("img");
        img.src = url;
        img.loading = "lazy";
        card.appendChild(img);
        grid.appendChild(card);
      });
    })
    .catch((err) => {
      statusEl.textContent = "Unable to load photos.";
      errorState.style.display = "block";
      errorState.textContent = "Cloudinary tag-based image list is not enabled. Enable it in Cloudinary settings.";
      console.warn(err);
    });
})();
