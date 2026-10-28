export function createLibraryUiModule(__appRuntimeContext) {
  function slugThemeDefaultsGroup(value) {
    return (
      String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "other"
    );
  }

  function getThemeDefaultsGroupRank(label) {
    const index = __appRuntimeContext.THEME_DEFAULTS_GROUP_ORDER.indexOf(label);
    return index === -1 ? __appRuntimeContext.THEME_DEFAULTS_GROUP_ORDER.length : index;
  }

  function getThemeDefaultsDisplayGroup(rootKey, leafKey, groupName) {
    const root = String(rootKey || "").toLowerCase();
    const leaf = String(leafKey || "").toLowerCase();
    if (["spring", "summer", "fall", "winter"].includes(root)) return groupName;
    if (root === "general" && leaf === "summer") return "Summer";
    return groupName || "Other";
  }

  function getSelectableThemeEntries() {
    // Keep the catalog and new-event picker limited to approved complete packs.
    const entries = [];
    const seenKeys = new Set();
    const addEntry = (entry) => {
      if (!entry || !entry.key || seenKeys.has(entry.key)) return;
      seenKeys.add(entry.key);
      entries.push(entry);
    };
    for (const rootKey of Object.keys(__appRuntimeContext.themes || {})) {
      if (rootKey === "_meta") continue;
      const group = __appRuntimeContext.themes[rootKey];
      if (!group || typeof group !== "object") continue;
      const groupName = String(group.name || rootKey).trim();
      for (const bucket of ["themes", "holidays"]) {
        const children = group[bucket];
        if (!children || typeof children !== "object") continue;
        for (const leafKey of Object.keys(children)) {
          if (!__appRuntimeContext.APPROVED_THEME_KEYS.has(`${rootKey}:${leafKey}`)) continue;
          const theme = children[leafKey];
          if (!theme || typeof theme !== "object") continue;
          if (!isCompletedTheme(theme)) continue;
          const displayGroup = getThemeDefaultsDisplayGroup(
            rootKey,
            leafKey,
            groupName
          );
          addEntry({
            key: `${rootKey}:${leafKey}`,
            group: displayGroup,
            groupKey: `group:${slugThemeDefaultsGroup(displayGroup)}`,
            label: String(theme.name || leafKey).trim(),
            rootKey,
            leafKey,
            bucket,
            theme,
          });
        }
      }
    }
    return entries.sort((a, b) =>
      getThemeDefaultsGroupRank(a.group) - getThemeDefaultsGroupRank(b.group) ||
      a.group.localeCompare(b.group) ||
      a.label.localeCompare(b.label)
    );
  }

  function isCompletedTheme(theme) {
    if (!theme || typeof theme !== "object") return false;
    const entries = (value) => (Array.isArray(value) ? value : []);
    const hasCoupleAndDateFields = (entry) => {
      const keys = new Set(
        __appRuntimeContext.normalizeTemplateTextFields(entry && entry.textFields).map((field) => field.key)
      );
      return keys.has("couple_names") && keys.has("event_date");
    };
    const hasScreen = (value, role = "") => {
      const screens = entries(value);
      return ["portrait", "landscape"].every((orientation) =>
        screens.some((entry) => {
          if (!entry || typeof entry !== "object") return false;
          if (role && entry.role && entry.role !== role) return false;
          return (
            __appRuntimeContext.normalizeIdleScreenOrientation(entry.orientation) === orientation &&
            !!__appRuntimeContext.getAssetEntrySrc(entry)
          );
        })
      );
    };
    const idleScreens = entries(theme.idleScreens);
    const photoChoiceScreens = entries(theme.photoChoiceScreens).length
      ? theme.photoChoiceScreens
      : idleScreens;
    const overlays = entries(theme.overlays);
    const hasPhotoOverlay = (orientation) =>
      overlays.some((entry) => {
        if (!entry || typeof entry !== "object" || !__appRuntimeContext.getAssetEntrySrc(entry)) {
          return false;
        }
        const entryOrientation = __appRuntimeContext.normalizePhotoOverlayOrientation(entry.orientation);
        return !entryOrientation || entryOrientation === orientation;
      });
    const weddingLayoutOrientations = new Set(
      overlays
        .filter((entry) => entry && hasCoupleAndDateFields(entry))
        .map((entry) => __appRuntimeContext.normalizePhotoOverlayOrientation(entry.orientation))
        .filter(Boolean)
    );
    const hasReusableWeddingLayouts =
      entries(theme.eventTypes).includes("wedding") &&
      weddingLayoutOrientations.has("portrait") &&
      weddingLayoutOrientations.has("landscape") &&
      entries(theme.templates).some(
        (template) =>
          __appRuntimeContext.normalizeTemplateLayout(template && template.layout) === "photo_strip_3" &&
          hasCoupleAndDateFields(template)
      );
    // Wedding layouts can reuse the app's shared guest screens; each event only
    // supplies names and a date, while the printable artwork stays reusable.
    if (hasReusableWeddingLayouts) return true;
    return (
      hasScreen(idleScreens, "idle") &&
      hasScreen(photoChoiceScreens, "photo-choice") &&
      hasScreen(theme.thankYouScreens) &&
      hasPhotoOverlay("portrait") &&
      hasPhotoOverlay("landscape")
    );
  }

  function getSelectableThemeGroups() {
    const groups = new Map();
    getSelectableThemeEntries().forEach((entry) => {
      const groupKey = entry.groupKey || `group:${slugThemeDefaultsGroup(entry.group)}`;
      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          key: groupKey,
          label: entry.group || "Other",
          entries: [],
        });
      }
      groups.get(groupKey).entries.push(entry);
    });
    return Array.from(groups.values()).sort(
      (a, b) =>
        getThemeDefaultsGroupRank(a.label) - getThemeDefaultsGroupRank(b.label) ||
        a.label.localeCompare(b.label)
    );
  }

  function getExplicitThemeAssetEntries(category, theme) {
    if (!theme || typeof theme !== "object") return [];
    if (category === "background")
      return Array.isArray(theme.backgrounds) ? theme.backgrounds : [];
    if (category === "overlay")
      return Array.isArray(theme.overlays) ? theme.overlays : [];
    if (category === "template")
      return Array.isArray(theme.templates) ? theme.templates : [];
    if (category === "idle-screen")
      return Array.isArray(theme.idleScreens) ? theme.idleScreens : [];
    return [];
  }

  function buildThemeDefaultAssetEntry(asset) {
    const src = __appRuntimeContext.getAssetEntrySrc(asset);
    if (!src) return null;
    const category = __appRuntimeContext.normalizeUploadedAssetCategory(asset.category);
    const raw = asset.raw && typeof asset.raw === "object" ? asset.raw : {};
    if (category === "background") return src;
    if (category === "overlay") {
      return {
        ...__appRuntimeContext.cloneThemeValue(raw),
        src,
        name: asset.name,
        photoSlots: raw.photoSlots || asset.photoSlots,
      };
    }
    if (category === "template") {
      return {
        ...__appRuntimeContext.cloneThemeValue(raw),
        src,
        layout: __appRuntimeContext.normalizeTemplateLayout(raw.layout || asset.layout || "double_column"),
        slots: raw.slots,
        photoSlots: asset.photoSlots || raw.photoSlots,
        background: raw.background,
        foreground: raw.foreground,
        textFields: __appRuntimeContext.normalizeTemplateTextFields(raw.textFields || asset.textFields),
      };
    }
    if (category === "idle-screen") {
      const role = asset.role === "photo-choice" ? "photo-choice" : "idle";
      return {
        ...__appRuntimeContext.cloneThemeValue(raw),
        src,
        name: asset.name,
        contentType: asset.contentType || raw.contentType || "",
        orientation: __appRuntimeContext.normalizeIdleScreenOrientation(asset.orientation),
        role,
        buttonZones:
          role === "photo-choice"
            ? {
                singlePhoto: __appRuntimeContext.normalizeIdleButtonZone(asset.buttonZones && asset.buttonZones.singlePhoto || __appRuntimeContext.photoChoiceEditorZones.singlePhoto),
                photoStrip: __appRuntimeContext.normalizeIdleButtonZone(asset.buttonZones && asset.buttonZones.photoStrip || __appRuntimeContext.photoChoiceEditorZones.photoStrip),
              }
            : { start: __appRuntimeContext.normalizeIdleButtonZone(asset.buttonZones && asset.buttonZones.start) },
      };
    }
    return null;
  }

  function replaceThemeDefaultEntries(theme, category, entries) {
    const arrayName = getThemeDefaultArrayName(category);
    const removedArrayName = getThemeRemovedArrayName(category);
    if (!theme || typeof theme !== "object" || !arrayName) return [];
    const seen = new Set();
    const nextEntries = [];
    (Array.isArray(entries) ? entries : []).forEach((entry) => {
      const src = __appRuntimeContext.getAssetEntrySrc(entry);
      if (!src || seen.has(src)) return;
      seen.add(src);
      nextEntries.push(__appRuntimeContext.cloneThemeValue(entry));
    });
    theme[arrayName] = nextEntries;
    if (removedArrayName && Array.isArray(theme[removedArrayName])) {
      theme[removedArrayName] = theme[removedArrayName].filter(
        (item) => !seen.has(__appRuntimeContext.getAssetEntrySrc(item))
      );
    }
    return nextEntries;
  }

  function getThemeDefaultArrayName(category) {
    if (category === "background") return "backgrounds";
    if (category === "overlay") return "overlays";
    if (category === "template") return "templates";
    if (category === "idle-screen") return "idleScreens";
    return "";
  }

  function getThemeRemovedArrayName(category) {
    if (category === "background") return "backgroundsRemoved";
    if (category === "overlay") return "overlaysRemoved";
    if (category === "template") return "templatesRemoved";
    return "";
  }

  function getThemeDefaultSelectionKeySet(category, src) {
    const selectedKeys = new Set();
    if (!category || !src) return selectedKeys;
    getSelectableThemeEntries().forEach(({ key, theme }) => {
      if (
        getExplicitThemeAssetEntries(category, theme).some(
          (item) => __appRuntimeContext.getAssetEntrySrc(item) === src
        )
      ) {
        selectedKeys.add(key);
      }
    });
    return selectedKeys;
  }

  function populateAssetThemeDefaultsModal(asset) {
    const category = __appRuntimeContext.normalizeUploadedAssetCategory(asset && asset.category);
    const src = __appRuntimeContext.getAssetEntrySrc(asset);
    if (!asset || !category || !src || !__appRuntimeContext.DOM.assetThemeDefaultsModal) return null;
    __appRuntimeContext.activeThemeDefaultsAsset = asset;
    if (__appRuntimeContext.DOM.assetThemeDefaultsTitle)
      __appRuntimeContext.DOM.assetThemeDefaultsTitle.textContent = "Theme Defaults";
    if (__appRuntimeContext.DOM.assetThemeDefaultsSummary)
      __appRuntimeContext.DOM.assetThemeDefaultsSummary.textContent =
        "Choose which themes use this asset by default.";
    const list = __appRuntimeContext.DOM.assetThemeDefaultsList;
    if (list) {
      list.innerHTML = "";
      const selectedKeys = getThemeDefaultSelectionKeySet(category, src);
      getSelectableThemeGroups().forEach((themeGroup) => {
        const group = document.createElement("div");
        group.className = "theme-defaults-group";
        const title = document.createElement("div");
        title.className = "theme-defaults-group-title";
        title.textContent = themeGroup.label;
        group.appendChild(title);
        if (themeGroup.entries.length > 1) {
          const parentLabel = document.createElement("label");
          parentLabel.className =
            "theme-defaults-option theme-defaults-parent-option";
          const parentCheckbox = document.createElement("input");
          parentCheckbox.type = "checkbox";
          parentCheckbox.value = themeGroup.key;
          parentCheckbox.dataset.themeGroupKey = themeGroup.key;
          const checkedCount = themeGroup.entries.filter((entry) =>
            selectedKeys.has(entry.key)
          ).length;
          parentCheckbox.checked = checkedCount === themeGroup.entries.length;
          parentCheckbox.indeterminate =
            checkedCount > 0 && checkedCount < themeGroup.entries.length;
          parentCheckbox.addEventListener("change", () => {
            group
              .querySelectorAll(`input[data-theme-parent="${themeGroup.key}"]`)
              .forEach((input) => {
                input.checked = parentCheckbox.checked;
              });
            syncAssetThemeGroupCheckboxes();
          });
          const parentText = document.createElement("span");
          parentText.textContent = `All ${themeGroup.label}`;
          parentLabel.append(parentCheckbox, parentText);
          group.appendChild(parentLabel);
        }
        themeGroup.entries.forEach((entry) => {
          const label = document.createElement("label");
          label.className =
            "theme-defaults-option theme-defaults-child-option";
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.value = entry.key;
          checkbox.dataset.themeKey = entry.key;
          checkbox.dataset.themeParent = themeGroup.key;
          checkbox.checked = selectedKeys.has(entry.key);
          checkbox.addEventListener("change", syncAssetThemeGroupCheckboxes);
          const text = document.createElement("span");
          text.textContent = entry.label;
          label.append(checkbox, text);
          group.appendChild(label);
        });
        list.appendChild(group);
      });
    }
    syncAssetThemeGroupCheckboxes();
    return { category, src };
  }

  function openAssetThemeDefaultsModal(asset) {
    if (!populateAssetThemeDefaultsModal(asset)) return;
    __appRuntimeContext.DOM.assetThemeDefaultsModal.classList.remove("hidden");
    __appRuntimeContext.DOM.assetThemeDefaultsModal.classList.add("show");
  }

  function toggleCurrentThemeAssetDefault(asset) {
    const category = __appRuntimeContext.normalizeUploadedAssetCategory(asset && asset.category);
    const src = __appRuntimeContext.getAssetEntrySrc(asset);
    const themeKey = __appRuntimeContext.normalizeThemeSelectionKey(
      __appRuntimeContext.getSelectedThemeKey()
    );
    const themeEntry = getSelectableThemeEntries().find((entry) => entry.key === themeKey);
    const arrayName = getThemeDefaultArrayName(category);
    if (!themeEntry || !arrayName || !src) return;

    const current = getExplicitThemeAssetEntries(category, themeEntry.theme);
    const exists = current.some((entry) => __appRuntimeContext.getAssetEntrySrc(entry) === src);
    const next = exists
      ? current.filter((entry) => __appRuntimeContext.getAssetEntrySrc(entry) !== src)
      : [...current, __appRuntimeContext.buildThemeDefaultAssetEntry(asset)];
    __appRuntimeContext.replaceThemeDefaultEntries(themeEntry.theme, category, next);
    __appRuntimeContext.saveThemesToStorage();
    if (!exists) __appRuntimeContext.clearSessionRemovedAsset(category, src);
    __appRuntimeContext.loadTheme(themeKey);
    renderAssetLibrary();
    __appRuntimeContext.updateLaunchSummary();
    __appRuntimeContext.showToast(exists ? "Removed from current theme." : "Added to current theme.");
  }

  function updateAssetThemeDefaultsSelectionCount() {
    if (!__appRuntimeContext.DOM.assetThemeDefaultsSelectionCount) return;
    const count = __appRuntimeContext.DOM.assetThemeDefaultsList
      ? __appRuntimeContext.DOM.assetThemeDefaultsList.querySelectorAll(
          "input[data-theme-key]:checked"
        )
          .length
      : 0;
    __appRuntimeContext.DOM.assetThemeDefaultsSelectionCount.textContent = `Selected for ${count} theme${
      count === 1 ? "" : "s"
    }`;
  }

  function syncAssetThemeGroupCheckboxes() {
    if (!__appRuntimeContext.DOM.assetThemeDefaultsList) {
      updateAssetThemeDefaultsSelectionCount();
      return;
    }
    __appRuntimeContext.DOM.assetThemeDefaultsList
      .querySelectorAll("input[data-theme-group-key]")
      .forEach((groupInput) => {
        const groupKey = groupInput.dataset.themeGroupKey;
        const children = Array.from(
          __appRuntimeContext.DOM.assetThemeDefaultsList.querySelectorAll(
            `input[data-theme-parent="${groupKey}"]`
          )
        );
        const checkedCount = children.filter((input) => input.checked).length;
        groupInput.checked =
          children.length > 0 && checkedCount === children.length;
        groupInput.indeterminate =
          checkedCount > 0 && checkedCount < children.length;
      });
    updateAssetThemeDefaultsSelectionCount();
  }

  function selectCurrentThemeForAssetDefaults() {
    const key = __appRuntimeContext.normalizeThemeSelectionKey(__appRuntimeContext.getSelectedThemeKey());
    if (!key || !__appRuntimeContext.DOM.assetThemeDefaultsList) return;
    const checkbox = Array.from(
      __appRuntimeContext.DOM.assetThemeDefaultsList.querySelectorAll("input[data-theme-key]")
    ).find((input) => input.value === key);
    if (!checkbox) return;
    checkbox.checked = true;
    syncAssetThemeGroupCheckboxes();
  }

  function clearAssetThemeDefaults() {
    if (!__appRuntimeContext.DOM.assetThemeDefaultsList) return;
    __appRuntimeContext.DOM.assetThemeDefaultsList
      .querySelectorAll("input[data-theme-key]")
      .forEach((input) => {
        input.checked = false;
      });
    syncAssetThemeGroupCheckboxes();
  }

  function closeAssetThemeDefaultsModal() {
    __appRuntimeContext.activeThemeDefaultsAsset = null;
    if (__appRuntimeContext.DOM.assetThemeDefaultsModal) {
      __appRuntimeContext.DOM.assetThemeDefaultsModal.classList.remove("show");
      __appRuntimeContext.DOM.assetThemeDefaultsModal.classList.add("hidden");
    }
  }

  function saveAssetThemeDefaults() {
    const asset = __appRuntimeContext.activeThemeDefaultsAsset;
    const category = __appRuntimeContext.normalizeUploadedAssetCategory(asset && asset.category);
    const src = __appRuntimeContext.getAssetEntrySrc(asset);
    const arrayName = getThemeDefaultArrayName(category);
    if (!asset || !category || !src || !arrayName) return;
    const selected = new Set(
      Array.from(
        __appRuntimeContext.DOM.assetThemeDefaultsList
          ? __appRuntimeContext.DOM.assetThemeDefaultsList.querySelectorAll(
              "input[data-theme-key]:checked"
            )
          : []
      ).map((input) => input.value)
    );
    const entryForDefaults = buildThemeDefaultAssetEntry(asset);
    getSelectableThemeEntries().forEach(({ key, theme }) => {
      const current = getExplicitThemeAssetEntries(category, theme);
      const hasAsset = current.some((item) => __appRuntimeContext.getAssetEntrySrc(item) === src);
      if (selected.has(key) && !hasAsset && entryForDefaults) {
        replaceThemeDefaultEntries(theme, category, [...current, entryForDefaults]);
      } else if (!selected.has(key) && hasAsset) {
        replaceThemeDefaultEntries(
          theme,
          category,
          current.filter((item) => __appRuntimeContext.getAssetEntrySrc(item) !== src)
        );
      }
    });
    __appRuntimeContext.saveThemesToStorage();
    const selectedThemeKey = __appRuntimeContext.normalizeThemeSelectionKey(
      __appRuntimeContext.getSelectedThemeKey()
    );
    if (selectedThemeKey && selected.has(selectedThemeKey)) {
      __appRuntimeContext.clearSessionRemovedAsset(category, src);
    }
    if (selectedThemeKey) __appRuntimeContext.loadTheme(selectedThemeKey);
    populateAssetThemeDefaultsModal(asset);
    renderAssetLibrary();
    __appRuntimeContext.updateLaunchSummary();
    closeAssetThemeDefaultsModal();
    __appRuntimeContext.showToast("Default theme choices saved.");
  }

  function registerUploadedAsset(url, kind, details = {}) {
    const category = __appRuntimeContext.normalizeUploadedAssetCategory(kind);
    if (!url || !category) return;
    const uploadedName = details.name || details.originalName || url.split("/").pop() || category;
    const isPhotoChoice =
      category === "idle-screen" &&
      (details.role === "photo-choice" ||
        __appRuntimeContext.isPhotoChoiceAssetKind(kind) ||
        /photo[\s_-]*choice/i.test(uploadedName));
    const asset = {
      id: `${category}:${url}`,
      category,
      url,
      secure_url: url,
      name: uploadedName,
      tags: __appRuntimeContext.normalizeAssetTags([
        ...(Array.isArray(details.tags) ? details.tags : []),
        __appRuntimeContext.getMainAssetLibraryCategory(),
      ]),
      folder: details.folder || "",
      hash: details.hash || "",
      contentType: details.contentType || "",
      originalSrc: details.originalSrc || "",
      createdAt: details.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      customizable: details.customizable === true,
      editableFields: __appRuntimeContext.normalizeEditableFields(details.editableFields),
      hidden: false,
      archived: false,
      orientation:
        category === "idle-screen"
          ? __appRuntimeContext.normalizeIdleScreenOrientation(details.orientation)
          : undefined,
      role:
        category === "idle-screen"
          ? isPhotoChoice
            ? "photo-choice"
            : "idle"
          : undefined,
      buttonZones:
        category === "idle-screen"
          ? isPhotoChoice
            ? {
                singlePhoto: __appRuntimeContext.normalizeIdleButtonZone(__appRuntimeContext.photoChoiceEditorZones.singlePhoto),
                photoStrip: __appRuntimeContext.normalizeIdleButtonZone(__appRuntimeContext.photoChoiceEditorZones.photoStrip),
              }
            : { start: __appRuntimeContext.normalizeIdleButtonZone(details.buttonZones && details.buttonZones.start) }
          : undefined,
      photoSlots:
        category === "overlay" || category === "template"
          ? Array.isArray(details.photoSlots)
            ? details.photoSlots
            : []
          : undefined,
    };
    if (__appRuntimeContext.mergeLibraryAsset(asset)) {
      __appRuntimeContext.syncAssetLibraryRemoteAsset(asset).catch(() => {});
      __appRuntimeContext.showToast(
        category === "idle-screen"
          ? `${
              __appRuntimeContext.normalizeIdleScreenOrientation(asset.orientation) === "portrait"
                ? "Portrait"
                : "Landscape"
            } theme screen saved to the preset.`
          : __appRuntimeContext.isAssetHiddenByCurrentLibraryFilters(asset)
          ? "Asset saved, but hidden by current filters. Clear filters to view it."
          : "Asset saved and visible in Asset Library."
      );
    }
  }

  function resetAssetLibraryVisibleCount() {
    __appRuntimeContext.assetLibraryState.visibleCount = __appRuntimeContext.ASSET_LIBRARY_PAGE_SIZE;
  }

  function renderAssetLibraryPills() {
    const pillsContainer = __appRuntimeContext.DOM.assetLibraryPills;
    if (!pillsContainer) return;

    const allAssets = __appRuntimeContext.getVisibleAssetLibraryRows();
    const counts = {
      all: allAssets.length,
      background: 0,
      overlay: 0,
      template: 0,
    };

    allAssets.forEach((asset) => {
      const category = __appRuntimeContext.normalizeUploadedAssetCategory(asset.category);
      if (counts[category] !== undefined) {
        counts[category]++;
      }
    });

    const categories = [
      { key: "all", label: "All" },
      { key: "background", label: "Backgrounds" },
      { key: "overlay", label: "Overlays" },
      { key: "template", label: "Templates" },
    ];

    pillsContainer.innerHTML = "";
    categories.forEach((cat) => {
      const pill = document.createElement("button");
      pill.type = "button";
      pill.className = "asset-library-pill";
      const activeKey = __appRuntimeContext.assetLibraryState.selectedCategory || "all";
      if (activeKey === cat.key) {
        pill.classList.add("active");
      }
      pill.innerHTML = `${cat.label} <span class="asset-library-pill-count">${counts[cat.key] || 0}</span>`;
      pill.addEventListener("click", () => {
        __appRuntimeContext.assetLibraryState.selectedCategory = cat.key;
        resetAssetLibraryVisibleCount();
        renderAssetLibraryPills();
        renderAssetLibrary();
      });
      pillsContainer.appendChild(pill);
    });
  }

  function renderAssetLibraryHolidayFilter() {
    const select = __appRuntimeContext.DOM.assetLibraryHolidayTheme;
    const wrapper = __appRuntimeContext.DOM.assetLibraryHolidayFilterWrap;
    if (!select || !wrapper) return;
    const selectedCategory = __appRuntimeContext.DOM.assetLibraryCategory
      ? __appRuntimeContext.DOM.assetLibraryCategory.value
      : "";
    const category = selectedCategory || __appRuntimeContext.getMainAssetLibraryCategory();
    const isHolidayCategory = category === "holidays";
    wrapper.classList.toggle("hidden", !isHolidayCategory);
    if (!isHolidayCategory) {
      __appRuntimeContext.assetLibraryState.selectedHolidayThemeKey = "";
    }

    const options = __appRuntimeContext.HOLIDAY_THEME_INDEX || [];
    select.innerHTML = '<option value="">All holidays</option>';
    options.forEach((option) => {
      const element = document.createElement("option");
      element.value = option.key;
      element.textContent = option.label;
      select.appendChild(element);
    });
    select.value = __appRuntimeContext.assetLibraryState.selectedHolidayThemeKey || "";
  }

  function renderAssetLibrary() {
    const grid = __appRuntimeContext.DOM.assetLibraryGrid;
    const status = __appRuntimeContext.DOM.assetLibraryStatus;
    if (!grid && !status) return;
    const panel = document.getElementById("uploaded" + "AssetLibraryPanel");
    if (panel && !panel.open) return;
    renderAssetLibraryPills();
    renderAssetLibraryHolidayFilter();

    // Update search query from DOM
    if (__appRuntimeContext.DOM.assetLibrarySearch) {
      __appRuntimeContext.assetLibraryState.searchQuery = __appRuntimeContext.DOM.assetLibrarySearch.value.trim().toLowerCase();
    }

    // Get filtered and sorted assets
    const assets = __appRuntimeContext.getFilteredAssetLibraryRows();

    // Render grid
    const visibleAssets = assets.slice(0, __appRuntimeContext.assetLibraryState.visibleCount);

    if (grid) {
      grid.innerHTML = "";

      if (visibleAssets.length === 0) {
        const empty = document.createElement("div");
        empty.className = "asset-library-empty";
        empty.textContent = "No assets available.";
        grid.appendChild(empty);
      } else {
        visibleAssets.forEach((asset) => {
          const assetSrc = __appRuntimeContext.getAssetEntrySrc(asset);
          const effectiveAssetSet = __appRuntimeContext.getSessionEffectiveAssetSourceSet(asset.category);
          const isSelected = effectiveAssetSet.has(assetSrc);
          const card = document.createElement("div");
          card.className = "asset-library-card";
          card.classList.toggle("selected", isSelected);
          card.setAttribute("aria-selected", isSelected ? "true" : "false");
          card.setAttribute("role", "button");
          card.tabIndex = 0;
          card.addEventListener("click", () => toggleLibraryAsset(asset));
          card.addEventListener("keydown", (event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            toggleLibraryAsset(asset);
          });
          const img = __appRuntimeContext.createAssetPreviewMedia(
            asset,
            asset.name || asset.category
          );
          img.onerror = () => __appRuntimeContext.renderMissingThumbnail(card, assetSrc);
          const name = document.createElement("div");
          name.className = "asset-library-name";
          name.title = `${asset.name}${asset.tags && asset.tags.length ? ` (${asset.tags.join(", ")})` : ""}`;
          name.textContent = __appRuntimeContext.getAssetDisplayName(asset);
          const meta = document.createElement("div");
          meta.className = "asset-library-meta";
          meta.textContent = [asset.category, __appRuntimeContext.getAssetCreatedAtLabel(asset)]
            .filter(Boolean)
            .join(" • ");
          const badges = document.createElement("div");
          badges.className = "asset-library-badges";
          if (asset.category === "idle-screen") {
            const orientationBadge = document.createElement("span");
            orientationBadge.className = "asset-library-badge";
            orientationBadge.textContent =
              __appRuntimeContext.normalizeIdleScreenOrientation(asset.orientation) === "portrait"
                ? "Portrait"
                : "Landscape";
            badges.appendChild(orientationBadge);
            const roleBadge = document.createElement("span");
            roleBadge.className = "asset-library-badge";
            roleBadge.textContent =
              asset.role === "photo-choice" ? "Photo choice" : "Idle screen";
            badges.appendChild(roleBadge);
          }
          if (__appRuntimeContext.isAssetLibraryFavorite(asset)) {
            const favoriteBadge = document.createElement("span");
            favoriteBadge.className = "asset-library-badge";
            favoriteBadge.textContent = "Favorite";
            badges.appendChild(favoriteBadge);
          }
          const actions = document.createElement("div");
          actions.className = "asset-library-actions";
          const favoriteBtn = document.createElement("button");
          favoriteBtn.type = "button";
          favoriteBtn.className = "asset-library-favorite";
          favoriteBtn.textContent = __appRuntimeContext.isAssetLibraryFavorite(asset)
            ? "Unfavorite"
            : "Favorite";
          favoriteBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            const isFavorite = __appRuntimeContext.toggleAssetLibraryFavorite(asset);
            renderAssetLibrary();
            __appRuntimeContext.showToast(isFavorite ? "Asset added to favorites." : "Asset removed from favorites.");
          });
          const renameBtn = document.createElement("button");
          renameBtn.type = "button";
          renameBtn.textContent = "Rename";
          renameBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            __appRuntimeContext.promptForAssetName(asset);
          });
          const tagsBtn = document.createElement("button");
          tagsBtn.type = "button";
          tagsBtn.textContent = "Tags";
          tagsBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            __appRuntimeContext.promptForAssetTags(asset);
          });
          const defaultsBtn = document.createElement("button");
          defaultsBtn.type = "button";
          defaultsBtn.textContent = "Theme defaults";
          defaultsBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            openAssetThemeDefaultsModal(asset);
          });
          const currentThemeBtn = document.createElement("button");
          currentThemeBtn.type = "button";
          const currentThemeKey = __appRuntimeContext.normalizeThemeSelectionKey(
            __appRuntimeContext.getSelectedThemeKey()
          );
          const currentThemeEntry = getSelectableThemeEntries().find(
            (entry) => entry.key === currentThemeKey
          );
          const currentThemeHasAsset = currentThemeEntry &&
            getExplicitThemeAssetEntries(asset.category, currentThemeEntry.theme).some(
              (entry) => __appRuntimeContext.getAssetEntrySrc(entry) === assetSrc
            );
          currentThemeBtn.textContent = currentThemeHasAsset
            ? "Remove from Current Theme"
            : "Add to Current Theme";
          currentThemeBtn.disabled = !currentThemeEntry;
          currentThemeBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            toggleCurrentThemeAssetDefault(asset);
          });
          const greenScreenBtn = document.createElement("button");
          greenScreenBtn.type = "button";
          greenScreenBtn.textContent = "Use as photo background";
          greenScreenBtn.classList.toggle("hidden", asset.category !== "background");
          greenScreenBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            useLibraryAssetAsGreenScreenBackground(asset);
          });
          const hotspotBtn = document.createElement("button");
          hotspotBtn.type = "button";
          hotspotBtn.textContent = asset.role === "photo-choice" ? "Position Choices" : "Position Start";
          hotspotBtn.classList.toggle("hidden", asset.category !== "idle-screen");
          hotspotBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            __appRuntimeContext.openIdleScreenEditor(asset);
          });
          const photoWindowBtn = document.createElement("button");
          photoWindowBtn.type = "button";
          photoWindowBtn.textContent = "Adjust Photo Window";
          photoWindowBtn.classList.toggle(
            "hidden",
            asset.category !== "overlay" && asset.category !== "template"
          );
          photoWindowBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            __appRuntimeContext.openOverlaySlotEditor(asset);
          });
          const deleteBtn = document.createElement("button");
          deleteBtn.type = "button";
          deleteBtn.textContent = "Delete from Library";
          deleteBtn.className = "asset-library-delete";
          deleteBtn.addEventListener("click", async (event) => {
            event.stopPropagation();
            const defaultCount = __appRuntimeContext.getAssetThemeDefaultCount(asset);
            const warning = defaultCount
              ? "\n\nThis asset is used by theme defaults."
              : "";
            if (!confirm(`Remove this asset from the Asset Library?${warning}`)) return;
            const saved = await __appRuntimeContext.deleteAssetLibraryItem(asset.id, asset);
            __appRuntimeContext.showToast(
              saved
                ? "Asset removed from Asset Library."
                : "Asset hidden on this device, but the change could not sync. Refresh and try again."
            );
          });
          actions.appendChild(favoriteBtn);
          actions.appendChild(renameBtn);
          actions.appendChild(tagsBtn);
          actions.appendChild(greenScreenBtn);
          actions.appendChild(hotspotBtn);
          actions.appendChild(photoWindowBtn);
          actions.appendChild(currentThemeBtn);
          actions.appendChild(defaultsBtn);
          actions.appendChild(deleteBtn);
          card.appendChild(img);
          card.appendChild(name);
          card.appendChild(meta);
          if (badges.childNodes.length) card.appendChild(badges);
          card.appendChild(actions);
          grid.appendChild(card);
        });

        // Show More button
        if (assets.length > __appRuntimeContext.assetLibraryState.visibleCount) {
          const showMoreBtn = document.createElement("button");
          showMoreBtn.type = "button";
          showMoreBtn.className = "asset-library-show-more";
          const remaining = assets.length - visibleAssets.length;
          const nextCount = Math.min(__appRuntimeContext.ASSET_LIBRARY_PAGE_SIZE, remaining);
          showMoreBtn.textContent = `Show ${nextCount} More (${remaining} remaining)`;
          showMoreBtn.addEventListener("click", () => {
            __appRuntimeContext.assetLibraryState.visibleCount += __appRuntimeContext.ASSET_LIBRARY_PAGE_SIZE;
            renderAssetLibrary();
          });
          grid.appendChild(showMoreBtn);
        }
      }
      grid.classList.toggle("has-selection", assets.some((asset) => {
        const assetSrc = __appRuntimeContext.getAssetEntrySrc(asset);
        const effectiveAssetSet = __appRuntimeContext.getSessionEffectiveAssetSourceSet(asset.category);
        return effectiveAssetSet.has(assetSrc);
      }));
    }
    if (status) {
      const total = __appRuntimeContext.getVisibleAssetLibraryRows().length;
      const filterLabels = [];
      if (__appRuntimeContext.assetLibraryState.selectedCategory && __appRuntimeContext.assetLibraryState.selectedCategory !== "all") {
        filterLabels.push(`Asset type: ${__appRuntimeContext.assetLibraryState.selectedCategory}`);
      }
      const selectedCategory = __appRuntimeContext.DOM.assetLibraryCategory
        ? __appRuntimeContext.DOM.assetLibraryCategory.value
        : "";
      const effectiveCategory =
        selectedCategory || __appRuntimeContext.getMainAssetLibraryCategory();
      if (effectiveCategory) {
        const option = selectedCategory
          ? __appRuntimeContext.DOM.assetLibraryCategory.selectedOptions[0]
          : null;
        const categoryLabel = option && option.textContent
          ? option.textContent
          : effectiveCategory.charAt(0).toUpperCase() + effectiveCategory.slice(1);
        filterLabels.push(`Category: ${categoryLabel}`);
      }
      const holidayThemeKey = __appRuntimeContext.assetLibraryState.selectedHolidayThemeKey;
      if (holidayThemeKey && __appRuntimeContext.DOM.assetLibraryHolidayTheme) {
        const holidayOption = __appRuntimeContext.DOM.assetLibraryHolidayTheme.selectedOptions[0];
        if (holidayOption && holidayOption.textContent) {
          filterLabels.push(`Holiday: ${holidayOption.textContent}`);
        }
      }
      if (__appRuntimeContext.assetLibraryState.searchQuery) {
        filterLabels.push(`Search: ${__appRuntimeContext.assetLibraryState.searchQuery}`);
      }
      if (__appRuntimeContext.DOM.assetLibraryClearFilters)
        __appRuntimeContext.DOM.assetLibraryClearFilters.classList.toggle(
          "hidden",
          !(
            selectedCategory ||
            holidayThemeKey ||
            __appRuntimeContext.assetLibraryState.searchQuery ||
            (__appRuntimeContext.assetLibraryState.selectedCategory &&
              __appRuntimeContext.assetLibraryState.selectedCategory !== "all")
          )
        );
      status.textContent = total
        ? filterLabels.length
          ? `Showing ${visibleAssets.length} of ${assets.length} matching assets (${total} total). Filters active: ${filterLabels.join(", ")}`
          : `Showing ${visibleAssets.length} of ${assets.length} assets`
        : "No assets available yet.";
    }
  }

  function toggleLibraryAsset(asset) {
    if (!asset) return;
    const src = __appRuntimeContext.getAssetEntrySrc(asset);
    const category = __appRuntimeContext.normalizeUploadedAssetCategory(asset.category);
    if (!src || !category) return;
    __appRuntimeContext.recordAssetLibraryRecent(asset);
    const effectiveAssetSet = __appRuntimeContext.getSessionEffectiveAssetSourceSet(category);
    const isSelected = effectiveAssetSet.has(src);
    const themeSources = __appRuntimeContext.getThemeAssetSourceSet(
      category,
      __appRuntimeContext.activeTheme || __appRuntimeContext.getSelectedThemeTarget()
    );
    const eventSources = __appRuntimeContext.getEventAssetSourceSet(category);
    if (isSelected) {
      __appRuntimeContext.removeSessionAssetBySrc(category, src);
    } else if (category === "background") {
      __appRuntimeContext.addSessionAssetUrl("backgrounds", src);
    } else if (themeSources.has(src) || eventSources.has(src)) {
      __appRuntimeContext.clearSessionRemovedAsset(category, src);
    } else if (category === "overlay") {
      __appRuntimeContext.addSessionAssetUrl("overlays", src);
    } else if (category === "template") {
      __appRuntimeContext.addSessionAssetUrl("templates", src);
    } else if (category === "idle-screen") {
      const entry = buildThemeDefaultAssetEntry(asset);
      const active = __appRuntimeContext.getActiveEvent();
      if (active) {
        const overrides = __appRuntimeContext.ensureEventOverrides(active);
        overrides.idleScreens = __appRuntimeContext.replaceIdleScreenRoleEntry(
          overrides.idleScreens,
          entry
        );
        __appRuntimeContext.updateActiveEventDetails({ overrides });
      } else {
        __appRuntimeContext.activeSessionAssets.idleScreens = __appRuntimeContext.replaceIdleScreenRoleEntry(
          __appRuntimeContext.activeSessionAssets.idleScreens,
          entry
        );
      }
    }
    if (category === "background") {
      __appRuntimeContext.applyThemeBackground(__appRuntimeContext.activeTheme || __appRuntimeContext.getSelectedThemeTarget());
    }
    if (__appRuntimeContext.DOM.options) __appRuntimeContext.renderOptions();
    __appRuntimeContext.renderCurrentAssets(__appRuntimeContext.activeTheme || __appRuntimeContext.getSelectedThemeTarget());
    renderAssetLibrary();
    __appRuntimeContext.updateLaunchSummary();
    __appRuntimeContext.showToast(isSelected ? "Asset removed from this session" : "Asset added to this session");
  }

  function useLibraryAssetAsGreenScreenBackground(asset) {
    if (!asset || __appRuntimeContext.normalizeUploadedAssetCategory(asset.category) !== "background") return;
    const src = __appRuntimeContext.getAssetEntrySrc(asset);
    if (!src) return;
    const active = __appRuntimeContext.getActiveEvent();
    if (active) {
      const overrides = __appRuntimeContext.ensureEventOverrides(active);
      if (!overrides.greenBackgrounds.includes(src)) overrides.greenBackgrounds.push(src);
      __appRuntimeContext.updateActiveEventDetails({ overrides });
    } else if (!__appRuntimeContext.activeSessionAssets.greenBackgrounds.includes(src)) {
      __appRuntimeContext.activeSessionAssets.greenBackgrounds.push(src);
    }
    __appRuntimeContext.renderCurrentAssets(__appRuntimeContext.activeTheme || __appRuntimeContext.getSelectedThemeTarget());
    __appRuntimeContext.renderOptions();
    __appRuntimeContext.updateLaunchSummary();
    __appRuntimeContext.showToast("Asset added as a photo background behind the guest.");
  }

  function getAssetUploadExtension(file) {
    return __appRuntimeContext.extFromName(file && file.name, "");
  }

  function validateManagedAssetUpload(file, kind) {
    if (!file) return { valid: false, message: "Choose a file first." };
    if (Number(file.size) === 0) {
      return { valid: false, message: "That file is empty." };
    }
    if (Number(file.size) > __appRuntimeContext.MAX_MANAGED_ASSET_UPLOAD_BYTES) {
      return {
        valid: false,
        message: "That file is larger than the 100 MB asset upload limit.",
      };
    }

    const contentType = String(file.type || "").trim().toLowerCase();
    const extension = getAssetUploadExtension(file);
    const claimsVideo =
      contentType.startsWith("video/") ||
      __appRuntimeContext.supportedVideoUploadExtensions.has(extension);
    const isVideoFile =
      __appRuntimeContext.supportedVideoUploadTypes.has(contentType) ||
      __appRuntimeContext.supportedVideoUploadExtensions.has(extension);
    const isImageFile =
      contentType.startsWith("image/") ||
      ["avif", "gif", "jpeg", "jpg", "png", "svg", "webp"].includes(extension);

    if (claimsVideo && !isVideoFile) {
      return {
        valid: false,
        message: "Use an MP4, MOV, WebM, M4V, OGV, or OGG video.",
      };
    }
    if (!isVideoFile && !isImageFile) {
      return {
        valid: false,
        message: "Use a supported image or video file.",
      };
    }

    const videoKinds = new Set([
      "background",
      "backgrounds",
      "greenBackgrounds",
      "idle-screens",
      "photo-choice-screens",
    ]);
    if (isVideoFile && !videoKinds.has(kind)) {
      return {
        valid: false,
        message:
          "Videos can be used for backgrounds, idle screens, and photo choice screens.",
      };
    }

    return { valid: true, isVideoFile };
  }

  function inferAssetOrientationFromName(file) {
    const name = String((file && file.name) || "").toLowerCase();
    if (name.includes("portrait")) return "portrait";
    if (name.includes("landscape")) return "landscape";
    return "general";
  }

  function detectVideoUploadOrientation(file) {
    const fallback = inferAssetOrientationFromName(file);
    if (
      !file ||
      typeof document === "undefined" ||
      typeof URL === "undefined" ||
      typeof URL.createObjectURL !== "function"
    ) {
      return Promise.resolve(fallback);
    }

    return new Promise((resolve) => {
      const video = document.createElement("video");
      const objectUrl = URL.createObjectURL(file);
      let settled = false;
      const finish = (orientation) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        video.removeAttribute("src");
        video.load();
        URL.revokeObjectURL(objectUrl);
        resolve(orientation);
      };
      const timeout = setTimeout(() => finish(fallback), 2500);
      video.preload = "metadata";
      video.muted = true;
      video.onloadedmetadata = () => {
        if (video.videoHeight > video.videoWidth) finish("portrait");
        else if (video.videoWidth > video.videoHeight) finish("landscape");
        else finish(fallback);
      };
      video.onerror = () => finish(fallback);
      video.src = objectUrl;
    });
  }

  function getCloudinaryUploadFailureMessage(payload, status) {
    const detail = String(
      payload && payload.error && payload.error.message
        ? payload.error.message
        : ""
    ).trim();
    return detail || `Cloudinary upload failed with status ${status || "unknown"}.`;
  }

  async function performManagedAssetUpload({
    file,
    kind,
    options,
    isVideoFile,
    hash,
    folder,
    indexKey,
    orientation,
  }) {
    const cfg = __appRuntimeContext.getCloudinaryConfig();
    if (!cfg.use || !cfg.cloud || !cfg.preset) {
      __appRuntimeContext.showToast("Upload failed: configure Cloudinary first.");
      return "";
    }

    try {
      __appRuntimeContext.showToast(isVideoFile ? "Uploading video…" : "Uploading asset…");
      const form = new FormData();
      const fname = `${kind || "file"}-${hash}.${__appRuntimeContext.extFromName(
        file && file.name,
        isVideoFile ? "mp4" : "png"
      )}`;
      const wrapped = new File([file], fname, {
        type: file.type || "application/octet-stream",
      });
      form.append("file", wrapped);
      form.append("upload_preset", cfg.preset);
      form.append("folder", folder);

      const resp = await fetch(
        `https://api.cloudinary.com/v1_1/${cfg.cloud}/${
          isVideoFile ? "video" : "image"
        }/upload`,
        { method: "POST", body: form }
      );
      let json = {};
      try {
        json = await resp.json();
      } catch (parseError) {
        console.warn("Cloudinary upload response was not JSON", parseError);
      }
      if (!resp.ok) {
        throw new Error(getCloudinaryUploadFailureMessage(json, resp.status));
      }

      const originalUrl = String(
        (json && (json.secure_url || json.url)) || ""
      ).trim();
      if (!originalUrl) {
        throw new Error("Cloudinary did not return an asset URL.");
      }

      if (isVideoFile) __appRuntimeContext.showToast("Preparing booth video…");
      const deliveryUrl = isVideoFile
        ? __appRuntimeContext.buildBoothVideoUrl(originalUrl)
        : originalUrl;
      if (!deliveryUrl) {
        throw new Error("The booth-ready asset URL could not be created.");
      }

      const index = __appRuntimeContext.getAssetIndex();
      index[indexKey] = deliveryUrl;
      __appRuntimeContext.saveThemesToStorage();
      registerUploadedAsset(deliveryUrl, kind, {
        name: file && file.name,
        originalSrc: originalUrl,
        role: __appRuntimeContext.isPhotoChoiceAssetKind(kind) ? "photo-choice" : undefined,
        hash,
        folder,
        contentType: isVideoFile ? "video/mp4" : file && file.type,
        orientation,
        buttonZones: options.buttonZones,
      });
      if (isVideoFile) __appRuntimeContext.showToast("Video ready.");
      return deliveryUrl;
    } catch (error) {
      console.error("Managed asset upload failed", error);
      const message =
        error && error.message
          ? `Upload failed: ${error.message}`
          : "Upload failed: check Cloudinary settings and try again.";
      __appRuntimeContext.showToast(message);
      return "";
    }
  }

  async function uploadAsset(file, kind, options = {}) {
    const validation = validateManagedAssetUpload(file, kind);
    if (!validation.valid) {
      __appRuntimeContext.showToast(validation.message);
      return "";
    }

    try {
      const hash = await __appRuntimeContext.fileSha256Hex(file);
      const folder = (
        options.folder || __appRuntimeContext.getThemeAssetUploadFolderPath(kind)
      ).replace(/\/+$/g, "");
      const indexKey = __appRuntimeContext.buildAssetIndexKey({ hash, folder });
      const uploadKey = `${kind || "asset"}::${indexKey}`;
      const orientation = validation.isVideoFile
        ? __appRuntimeContext.normalizeIdleScreenOrientation(
            options.orientation || (await detectVideoUploadOrientation(file))
          )
        : __appRuntimeContext.normalizeIdleScreenOrientation(options.orientation);
      if (__appRuntimeContext.activeManagedAssetUploads.has(uploadKey)) {
        __appRuntimeContext.showToast("That asset is already uploading.");
        return __appRuntimeContext.activeManagedAssetUploads.get(uploadKey);
      }
      const index = __appRuntimeContext.getAssetIndex();
      if (index[indexKey]) {
        const originalUrl = index[indexKey];
        const deliveryUrl = validation.isVideoFile
          ? __appRuntimeContext.buildBoothVideoUrl(originalUrl)
          : originalUrl;
        if (deliveryUrl !== originalUrl) {
          index[indexKey] = deliveryUrl;
          __appRuntimeContext.saveThemesToStorage();
        }
        registerUploadedAsset(deliveryUrl, kind, {
          name: file && file.name,
          originalSrc: originalUrl,
          role: __appRuntimeContext.isPhotoChoiceAssetKind(kind) ? "photo-choice" : undefined,
          hash,
          folder,
          contentType: validation.isVideoFile ? "video/mp4" : file && file.type,
          orientation,
          buttonZones: options.buttonZones,
        });
        if (validation.isVideoFile) __appRuntimeContext.showToast("Video ready.");
        return deliveryUrl;
      }

      const uploadPromise = performManagedAssetUpload({
        file,
        kind,
        options,
        isVideoFile: validation.isVideoFile,
        hash,
        folder,
        indexKey,
        orientation,
      }).finally(() => {
        __appRuntimeContext.activeManagedAssetUploads.delete(uploadKey);
      });
      __appRuntimeContext.activeManagedAssetUploads.set(uploadKey, uploadPromise);
      return uploadPromise;
    } catch (error) {
      console.error("Managed asset preparation failed", error);
      __appRuntimeContext.showToast("Upload failed: the selected asset could not be prepared.");
      return "";
    }
  }

  return {
    slugThemeDefaultsGroup,
    getThemeDefaultsGroupRank,
    getThemeDefaultsDisplayGroup,
    getSelectableThemeEntries,
    isCompletedTheme,
    getSelectableThemeGroups,
    getExplicitThemeAssetEntries,
    buildThemeDefaultAssetEntry,
    replaceThemeDefaultEntries,
    getThemeDefaultArrayName,
    getThemeRemovedArrayName,
    getThemeDefaultSelectionKeySet,
    populateAssetThemeDefaultsModal,
    openAssetThemeDefaultsModal,
    updateAssetThemeDefaultsSelectionCount,
    syncAssetThemeGroupCheckboxes,
    selectCurrentThemeForAssetDefaults,
    clearAssetThemeDefaults,
    closeAssetThemeDefaultsModal,
    saveAssetThemeDefaults,
    registerUploadedAsset,
    resetAssetLibraryVisibleCount,
    renderAssetLibraryPills,
    renderAssetLibrary,
    toggleLibraryAsset,
    useLibraryAssetAsGreenScreenBackground,
    getAssetUploadExtension,
    validateManagedAssetUpload,
    inferAssetOrientationFromName,
    detectVideoUploadOrientation,
    getCloudinaryUploadFailureMessage,
    performManagedAssetUpload,
    uploadAsset,
  };
}
