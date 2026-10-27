export function createThemePickerModule(__appRuntimeContext) {
  function populateCreatePathThemeSelect(preferredThemeKey) {
    if (!__appRuntimeContext.DOM.createPathThemeSelect) return;
    const options = __appRuntimeContext.getThemeOptions();
    const selectedBefore =
      preferredThemeKey || __appRuntimeContext.DOM.createPathThemeSelect.value || "";
    __appRuntimeContext.DOM.createPathThemeSelect.innerHTML = "";
    if (!options.length) {
      const empty = document.createElement("option");
      empty.value = "";
      empty.textContent = "No themes found";
      __appRuntimeContext.DOM.createPathThemeSelect.appendChild(empty);
      __appRuntimeContext.DOM.createPathThemeSelect.value = "";
      return;
    }
    options.forEach((opt) => {
      const next = document.createElement("option");
      next.value = opt.value;
      next.textContent = opt.textContent || opt.value;
      __appRuntimeContext.DOM.createPathThemeSelect.appendChild(next);
    });
    const hasPreferred = options.some((opt) => opt.value === selectedBefore);
    __appRuntimeContext.DOM.createPathThemeSelect.value = hasPreferred
      ? selectedBefore
      : options[0].value;
    const selectedKey = __appRuntimeContext.DOM.createPathThemeSelect.value || "";
    if (selectedKey && __appRuntimeContext.getSelectedThemeKey() !== selectedKey) {
      __appRuntimeContext.setActiveEventId("");
      __appRuntimeContext.setQuickStartSessionDate(__appRuntimeContext.getLocalIsoDate());
      __appRuntimeContext.setEventSelection(selectedKey);
      __appRuntimeContext.loadTheme(selectedKey);
    }
    syncSessionThemeSearch();
  }

  function getThemeOptionLabel(key = "") {
    const options = __appRuntimeContext.getThemeOptions();
    const match = options.find((option) => option.value === key);
    if (match) return match.textContent || key;
    return getThemeSetupDisplayLabel(key, __appRuntimeContext.resolveThemeByKey(key));
  }

  function normalizeThemeSetupText(value = "") {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function titleCaseThemeSetupText(value = "") {
    const clean = normalizeThemeSetupText(value);
    if (!clean) return "";
    const override = __appRuntimeContext.THEME_SETUP_LABEL_OVERRIDES[clean];
    if (override) return override;
    return clean
      .split(" ")
      .filter(Boolean)
      .map((part) => {
        if (part === "st") return "St.";
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join(" ");
  }

  function getThemeSetupDisplayLabel(themeKey, theme) {
    const normalizedKey = normalizeThemeSetupText(themeKey);
    const normalizedName = normalizeThemeSetupText(theme && theme.name);
    const normalizedText = [normalizedKey, normalizedName].filter(Boolean).join(" ");
    const directOverride =
      __appRuntimeContext.THEME_SETUP_LABEL_OVERRIDES[normalizedKey] ||
      __appRuntimeContext.THEME_SETUP_LABEL_OVERRIDES[normalizedName] ||
      __appRuntimeContext.THEME_SETUP_LABEL_OVERRIDES[normalizedText];
    if (directOverride) return directOverride;
    return titleCaseThemeSetupText((theme && theme.name) || themeKey || "");
  }

  function getThemeSetupDisplayGroup(themeKey, theme) {
    const normalized = [
      normalizeThemeSetupText(themeKey),
      normalizeThemeSetupText(getThemeSetupDisplayLabel(themeKey, theme)),
      normalizeThemeSetupText(theme && theme.category),
    ]
      .filter(Boolean)
      .join(" ");
    if (/(spring hill hawks|hawks cheer)/.test(normalized)) return "Sports";
    if (/(amanda north|ane|stream night)/.test(normalized)) return "Youth";
    if (/(garden vows|wedding)/.test(normalized)) return "Wedding";
    if (/(fourth of july|4th of july|halloween|christmas|valentine|st patrick)/.test(normalized)) return "Holidays";
    if (
      /(summer|fall|winter|spring|winter wonderland|santa s workshop|new year)/.test(
        normalized
      )
    ) {
      return "Seasonal";
    }
    return "General";
  }

  function getThemeSetupGroupIndex(group) {
    const index = __appRuntimeContext.THEME_SETUP_GROUP_ORDER.indexOf(group);
    return index === -1 ? __appRuntimeContext.THEME_SETUP_GROUP_ORDER.length : index;
  }

  function getThemeSetupItemIndex(group, label) {
    const items = __appRuntimeContext.THEME_SETUP_GROUP_ITEM_ORDER[group] || [];
    const index = items.indexOf(label);
    return index === -1 ? items.length : index;
  }

  function getSetupThemeEntries(filter = "") {
    const needle = normalizeThemeSetupText(filter);
    return __appRuntimeContext.getSelectableThemeEntries()
      .map((entry) => {
        const label = getThemeSetupDisplayLabel(entry.key, entry.theme);
        const group = getThemeSetupDisplayGroup(entry.key, entry.theme);
        return { ...entry, label, group };
      })
      .filter((entry) => {
        if (!__appRuntimeContext.APPROVED_THEME_KEYS.has(entry.key)) return false;
        if (!needle) return true;
        return normalizeThemeSetupText([entry.group, entry.label, entry.key].join(" "))
          .includes(needle);
      })
      .sort((a, b) => {
        const groupDiff =
          getThemeSetupGroupIndex(a.group) - getThemeSetupGroupIndex(b.group);
        if (groupDiff !== 0) return groupDiff;
        const itemDiff =
          getThemeSetupItemIndex(a.group, a.label) -
          getThemeSetupItemIndex(b.group, b.label);
        if (itemDiff !== 0) return itemDiff;
        return a.label.localeCompare(b.label);
      });
  }

  function getSessionThemeOptions(filter = "") {
    const needle = String(filter || "").trim().toLowerCase();
    return __appRuntimeContext.getThemeOptions().filter(
      (option) => {
        if (!option || !option.value) return false;
        if (!needle) return true;
        return (
          String(option.textContent || "").toLowerCase().includes(needle) ||
          String(option.value || "").toLowerCase().includes(needle)
        );
      }
    );
  }

  function renderSessionThemeOptions(filter = "") {
    if (__appRuntimeContext.DOM.sessionThemeOptions) {
      __appRuntimeContext.DOM.sessionThemeOptions.innerHTML = "";
      const selectedKey =
        (__appRuntimeContext.DOM.createPathThemeSelect && __appRuntimeContext.DOM.createPathThemeSelect.value) ||
        __appRuntimeContext.getSelectedThemeKey() ||
        "";
      const entries = getSetupThemeEntries(filter);
      const groupedEntries = new Map();
      entries.forEach((entry) => {
        if (!groupedEntries.has(entry.group)) groupedEntries.set(entry.group, []);
        groupedEntries.get(entry.group).push(entry);
      });
      const orderedGroups = __appRuntimeContext.THEME_SETUP_GROUP_ORDER.filter((group) =>
        groupedEntries.has(group)
      ).concat(
        Array.from(groupedEntries.keys()).filter(
          (group) => !__appRuntimeContext.THEME_SETUP_GROUP_ORDER.includes(group)
        )
      );
      orderedGroups.forEach((groupName) => {
        const groupEntries = groupedEntries.get(groupName);
        if (!groupEntries || !groupEntries.length) return;
        const group = document.createElement("div");
        group.className = "setup-combobox-group";
        const title = document.createElement("div");
        title.className = "setup-combobox-group-title";
        title.textContent = groupName;
        title.setAttribute("role", "presentation");
        title.setAttribute("aria-hidden", "true");
        const list = document.createElement("div");
        list.className = "setup-combobox-group-options";
        groupEntries.forEach((entry) => {
          const item = document.createElement("button");
          item.type = "button";
          item.className = "setup-combobox-option";
          item.textContent = entry.label;
          item.dataset.themeKey = entry.key;
          item.dataset.themeGroup = entry.group;
          item.setAttribute("role", "option");
          item.setAttribute(
            "aria-selected",
            entry.key === selectedKey ? "true" : "false"
          );
          item.addEventListener("click", () =>
            activateThemeFromSetupKey(entry.key)
          );
          list.appendChild(item);
        });
        group.appendChild(title);
        group.appendChild(list);
        __appRuntimeContext.DOM.sessionThemeOptions.appendChild(group);
      });
      if (!entries.length) {
        const empty = document.createElement("div");
        empty.className = "setup-combobox-empty";
        empty.textContent = "No themes found";
        __appRuntimeContext.DOM.sessionThemeOptions.appendChild(empty);
      }
    }
  }

  function syncSessionThemeSearch() {
    renderSessionThemeOptions();
    const key =
      (__appRuntimeContext.DOM.createPathThemeSelect && __appRuntimeContext.DOM.createPathThemeSelect.value) ||
      __appRuntimeContext.getSelectedThemeKey() ||
      "";
    if (__appRuntimeContext.DOM.sessionThemeValue)
      __appRuntimeContext.DOM.sessionThemeValue.textContent = getThemeOptionLabel(key) || "Choose theme";
    if (__appRuntimeContext.DOM.sessionThemeSearch) __appRuntimeContext.DOM.sessionThemeSearch.value = "";
    renderThemeQuickPicker();
  }

  function themeMatchesQuickFilter(entry, filter) {
    if (filter === "All") return true;
    const group = entry.group;
    if (filter === "Celebrations") return group === "General";
    if (filter === "Weddings") return group === "Wedding";
    if (filter === "Sports") return group === "Sports";
    if (filter === "Schools") return group === "Youth";
    if (filter === "Seasons") return group === "Seasonal";
    return group === "Holidays";
  }

  function getThemeQuickPreview(theme) {
    const idleScreens = Array.isArray(theme && theme.idleScreens) ? theme.idleScreens : [];
    const preferredIdle = idleScreens.find((entry) =>
      entry && (entry.orientation === "landscape" || entry.orientation === "portrait")
    );
    if (preferredIdle) {
      return preferredIdle.poster || __appRuntimeContext.getAssetEntrySrc(preferredIdle) || "";
    }
    const backgrounds = Array.isArray(theme && theme.backgrounds) ? theme.backgrounds : [];
    return __appRuntimeContext.getAssetEntrySrc(backgrounds[0]) || "";
  }

  function getThemeQuickMeta(theme) {
    const parts = [];
    const idleScreens = Array.isArray(theme && theme.idleScreens) ? theme.idleScreens : [];
    if (idleScreens.length) parts.push(`${idleScreens.length} guest screen${idleScreens.length === 1 ? "" : "s"}`);
    if (Array.isArray(theme && theme.backgrounds) && theme.backgrounds.length) parts.push(`${theme.backgrounds.length} background${theme.backgrounds.length === 1 ? "" : "s"}`);
    if (Array.isArray(theme && theme.overlays) && theme.overlays.length) parts.push(`${theme.overlays.length} frame${theme.overlays.length === 1 ? "" : "s"}`);
    return parts.length ? parts.join(" · ") : "Ready for your event";
  }

  function renderThemeQuickPicker() {
    if (!__appRuntimeContext.DOM.themeQuickFilters || !__appRuntimeContext.DOM.themeQuickGrid) return;
    const selectedKey = (__appRuntimeContext.DOM.createPathThemeSelect && __appRuntimeContext.DOM.createPathThemeSelect.value) || __appRuntimeContext.getSelectedThemeKey() || "";
    if (__appRuntimeContext.DOM.themeQuickFilters.dataset.bound !== "true") {
      __appRuntimeContext.THEME_QUICK_FILTERS.forEach((filter) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "theme-quick-filter";
        button.dataset.themeFilter = filter;
        button.textContent = filter;
        button.addEventListener("click", () => {
          __appRuntimeContext.activeThemeQuickFilter = filter;
          renderThemeQuickPicker();
        });
        __appRuntimeContext.DOM.themeQuickFilters.appendChild(button);
      });
      __appRuntimeContext.DOM.themeQuickFilters.dataset.bound = "true";
    }
    __appRuntimeContext.DOM.themeQuickFilters.querySelectorAll("[data-theme-filter]").forEach((button) => {
      const active = button.dataset.themeFilter === __appRuntimeContext.activeThemeQuickFilter;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    const allEntries = getSetupThemeEntries();
    allEntries.forEach((entry) => {
      if (!__appRuntimeContext.themeQuickOrderByKey.has(entry.key)) {
        __appRuntimeContext.themeQuickOrderByKey.set(entry.key, __appRuntimeContext.themeQuickOrderByKey.size);
      }
    });
    allEntries.sort(
      (a, b) => __appRuntimeContext.themeQuickOrderByKey.get(a.key) - __appRuntimeContext.themeQuickOrderByKey.get(b.key)
    );
    const entries = allEntries.filter((entry) => themeMatchesQuickFilter(entry, __appRuntimeContext.activeThemeQuickFilter));
    const visibleEntries = entries;
    const visibleKeys = new Set(visibleEntries.map((entry) => entry.key));
    __appRuntimeContext.themeQuickCardsByKey.forEach((card, key) => {
      if (!visibleKeys.has(key)) card.remove();
    });
    const observePreview = (node) => {
      if (!node.dataset.previewSrc) return;
      if ("IntersectionObserver" in window) {
        if (!__appRuntimeContext.themeQuickPreviewObserver) {
          __appRuntimeContext.themeQuickPreviewObserver = new IntersectionObserver((items, observer) => {
            items.forEach((item) => {
              if (!item.isIntersecting) return;
              const preview = item.target;
              const src = preview.dataset.previewSrc;
              if (src) preview.style.backgroundImage = `url("${src}")`;
              observer.unobserve(preview);
            });
          }, { rootMargin: "160px" });
        }
        __appRuntimeContext.themeQuickPreviewObserver.observe(node);
      } else {
        node.style.backgroundImage = `url("${node.dataset.previewSrc}")`;
      }
    };
    visibleEntries.forEach((entry, index) => {
      let card = __appRuntimeContext.themeQuickCardsByKey.get(entry.key);
      if (!card) {
        card = document.createElement("button");
        card.type = "button";
        card.className = "theme-quick-card";
        card.dataset.themeKey = entry.key;
        const preview = document.createElement("div");
        preview.className = "theme-quick-card-art";
        const copy = document.createElement("span");
        copy.className = "theme-quick-card-copy";
        const label = document.createElement("strong");
        const group = document.createElement("span");
        copy.append(label, group);
        card.append(preview, copy);
        card.addEventListener("click", () => activateThemeFromSetupKey(entry.key));
        __appRuntimeContext.themeQuickCardsByKey.set(entry.key, card);
      }
      const preview = card.querySelector(".theme-quick-card-art");
      const copy = card.querySelector(".theme-quick-card-copy");
      const label = copy.querySelector("strong");
      const group = copy.querySelector("span");
      if (label.textContent !== entry.label) label.textContent = entry.label;
      if (group.textContent !== entry.group) group.textContent = entry.group;
      const previewUrl = getThemeQuickPreview(entry.theme);
      const previewSrc = previewUrl ? __appRuntimeContext.getAssetPreviewSrc(previewUrl) : "";
      if (preview.dataset.previewSrc !== previewSrc) {
        preview.dataset.previewSrc = previewSrc;
        if (!previewSrc) {
          preview.style.backgroundImage = "";
          if (__appRuntimeContext.themeQuickPreviewObserver) __appRuntimeContext.themeQuickPreviewObserver.unobserve(preview);
        } else {
          observePreview(preview);
        }
      }
      const cardAtIndex = __appRuntimeContext.DOM.themeQuickGrid.children[index];
      if (cardAtIndex !== card) __appRuntimeContext.DOM.themeQuickGrid.insertBefore(card, cardAtIndex || null);
    });
    __appRuntimeContext.DOM.themeQuickGrid.querySelectorAll("[data-theme-key]").forEach((card) => {
      const active = card.dataset.themeKey === selectedKey;
      card.classList.toggle("active", active);
      card.setAttribute("aria-pressed", active ? "true" : "false");
    });
    const selectedEntry = getSetupThemeEntries().find((entry) => entry.key === selectedKey);
    if (__appRuntimeContext.DOM.themeQuickSelectionName) __appRuntimeContext.DOM.themeQuickSelectionName.textContent = selectedEntry ? selectedEntry.label : "Choose a theme";
    if (__appRuntimeContext.DOM.themeQuickSelectionMeta) __appRuntimeContext.DOM.themeQuickSelectionMeta.textContent = selectedEntry ? `${selectedEntry.group} · ${getThemeQuickMeta(selectedEntry.theme)}` : "Choose a look to see the included guest screens and photo styling.";
  }

  function resolveThemeKeyFromSearchValue(value = "") {
    const needle = String(value || "").trim().toLowerCase();
    if (!needle) return "";
    const options = __appRuntimeContext.getThemeOptions();
    const byLabel = options.find(
      (option) => String(option.textContent || "").trim().toLowerCase() === needle
    );
    if (byLabel) return byLabel.value;
    const byValue = options.find(
      (option) => String(option.value || "").trim().toLowerCase() === needle
    );
    return byValue ? byValue.value : "";
  }

  function activateThemeFromSetupSearch() {
    const key = resolveThemeKeyFromSearchValue(
      __appRuntimeContext.DOM.sessionThemeSearch ? __appRuntimeContext.DOM.sessionThemeSearch.value : ""
    );
    activateThemeFromSetupKey(key);
  }

  function activateThemeFromSetupKey(key) {
    if (!key) return;
    __appRuntimeContext.disableShowcaseDemo();
    __appRuntimeContext.setActiveEventId("");
    __appRuntimeContext.setQuickStartSessionDate(__appRuntimeContext.getLocalIsoDate());
    __appRuntimeContext.setEventSelection(key);
    if (__appRuntimeContext.DOM.createPathThemeSelect) __appRuntimeContext.DOM.createPathThemeSelect.value = key;
    __appRuntimeContext.loadTheme(key);
    __appRuntimeContext.updateLaunchSummary();
    renderThemeQuickPicker();
    closeSetupCombobox("theme");
  }

  function getSetupComboboxParts(kind) {
    if (kind === "theme") {
      return {
        toggle: __appRuntimeContext.DOM.sessionThemeToggle,
        menu: __appRuntimeContext.DOM.sessionThemeMenu,
        search: __appRuntimeContext.DOM.sessionThemeSearch,
        render: renderSessionThemeOptions,
      };
    }
    if (kind === "font") {
      return {
        toggle: __appRuntimeContext.DOM.sessionFontToggle,
        menu: __appRuntimeContext.DOM.sessionFontMenu,
        search: __appRuntimeContext.DOM.sessionFontSearch,
        render: __appRuntimeContext.renderSessionFontOptions,
      };
    }
    return {};
  }

  function closeSetupCombobox(kind) {
    const parts = getSetupComboboxParts(kind);
    if (!parts.menu) return;
    parts.menu.classList.add("hidden");
    if (parts.toggle) parts.toggle.setAttribute("aria-expanded", "false");
    if (parts.search) parts.search.value = "";
  }

  function openSetupCombobox(kind) {
    ["theme", "font"].forEach((name) => {
      if (name !== kind) closeSetupCombobox(name);
    });
    const parts = getSetupComboboxParts(kind);
    if (!parts.menu) return;
    if (typeof parts.render === "function") parts.render("");
    parts.menu.classList.remove("hidden");
    if (parts.toggle) parts.toggle.setAttribute("aria-expanded", "true");
    if (parts.search) {
      parts.search.value = "";
      requestAnimationFrame(() => parts.search.focus());
    }
  }

  function toggleSetupCombobox(kind) {
    const parts = getSetupComboboxParts(kind);
    if (!parts.menu) return;
    if (parts.menu.classList.contains("hidden")) openSetupCombobox(kind);
    else closeSetupCombobox(kind);
  }

  function selectFirstVisibleComboboxOption(kind) {
    const parts = getSetupComboboxParts(kind);
    if (!parts.menu) return;
    const option = parts.menu.querySelector(".setup-combobox-option");
    if (option) option.click();
  }

  function resetActiveSessionAssets() {
    __appRuntimeContext.activeSessionAssets = __appRuntimeContext.createEmptySessionAssets();
    __appRuntimeContext.activeSessionThemeKey = "";
    __appRuntimeContext.sessionRemovedBackgrounds = [];
    __appRuntimeContext.sessionRemovedOverlays = [];
    __appRuntimeContext.sessionRemovedTemplates = [];
  }

  function getSessionAssetUploadOptions(kind = "") {
    const base = __appRuntimeContext.getEventFolderBase();
    const date = __appRuntimeContext.getDateSessionSlug();
    const cleanKind = (kind || "misc").toString().replace(/^\/+|\/+$/g, "");
    return { folder: `${__appRuntimeContext.buildDateSessionFolderPath({ base, date })}/${cleanKind}` };
  }

  function addSessionAssetUrl(kind, url) {
    if (!url) return false;
    if (kind === "templates") {
      __appRuntimeContext.clearSessionRemovedAsset("template", url);
      const exists = __appRuntimeContext.activeSessionAssets.templates.some(
        (item) => __appRuntimeContext.getAssetEntrySrc(item) === url
      );
      if (!exists) __appRuntimeContext.activeSessionAssets.templates.push({ src: url, layout: "double_column" });
      return true;
    }
    if (kind === "overlays") {
      __appRuntimeContext.clearSessionRemovedAsset("overlay", url);
      const exists = __appRuntimeContext.activeSessionAssets.overlays.some(
        (item) => __appRuntimeContext.getAssetEntrySrc(item) === url
      );
      if (!exists) __appRuntimeContext.activeSessionAssets.overlays.push(url);
      return true;
    }
    if (kind === "backgrounds") {
      __appRuntimeContext.clearSessionRemovedAsset("background", url);
      __appRuntimeContext.activeSessionAssets.backgrounds = [url];
      __appRuntimeContext.activeSessionAssets.backgroundIndex = 0;
      return true;
    }
    if (kind === "greenBackgrounds") {
      __appRuntimeContext.activeSessionAssets.greenBackgrounds.push(url);
      return true;
    }
    if (kind === "logo") {
      __appRuntimeContext.activeSessionAssets.logo = url;
      return true;
    }
    return false;
  }

  function selectSessionBackground(src) {
    if (!src) return;
    __appRuntimeContext.clearSessionRemovedAsset("background", src);
    __appRuntimeContext.activeSessionAssets.backgrounds = [src];
    __appRuntimeContext.activeSessionAssets.backgroundIndex = 0;
    __appRuntimeContext.applyThemeBackground(__appRuntimeContext.activeTheme);
    __appRuntimeContext.renderCurrentAssets(__appRuntimeContext.activeTheme);
    __appRuntimeContext.updateLaunchSummary();
    __appRuntimeContext.showToast("Session background selected");
  }

  function selectSessionOverlay(entry) {
    const normalized = __appRuntimeContext.normalizeOverlayDefinition(entry);
    const src = normalized && normalized.src ? normalized.src : "";
    if (!src) return;
    __appRuntimeContext.clearSessionRemovedAsset("overlay", src);
    if (!Array.isArray(__appRuntimeContext.activeSessionAssets.overlays)) {
      __appRuntimeContext.activeSessionAssets.overlays = [];
    }
    const exists = __appRuntimeContext.activeSessionAssets.overlays.some(
      (item) => (typeof item === "string" ? item : item && item.src) === src
    );
    if (!exists) __appRuntimeContext.activeSessionAssets.overlays.unshift(normalized);
    __appRuntimeContext.selectedOverlay = src;
    __appRuntimeContext.lastPhotoOverlay = src;
    __appRuntimeContext.lastPhotoOverlayByOrientation[__appRuntimeContext.photoOverlayOrientation] = src;
    __appRuntimeContext.renderOptions();
    __appRuntimeContext.syncOverlayPreviewSurface({ mode: "live" });
    __appRuntimeContext.renderCurrentAssets(__appRuntimeContext.activeTheme);
    __appRuntimeContext.updateLaunchSummary();
    __appRuntimeContext.showToast("Session overlay selected");
  }

  async function uploadCreatePathSessionAssets(kind, fileList) {
    const files = Array.from(fileList || []).filter(Boolean);
    if (!files.length) return;
    const tasks = files.map(async (file) => {
      const url = await __appRuntimeContext.uploadAsset(file, kind, getSessionAssetUploadOptions(kind));
      return addSessionAssetUrl(kind, url);
    });
    const results = await Promise.all(tasks);
    const uploaded = results.filter(Boolean).length;
    if (uploaded) {
      __appRuntimeContext.renderCurrentAssets(__appRuntimeContext.activeTheme || __appRuntimeContext.getSelectedThemeTarget());
      __appRuntimeContext.renderOptions();
      __appRuntimeContext.updateCurrentEventAssetsPanel(__appRuntimeContext.activeTheme || __appRuntimeContext.getSelectedThemeTarget());
      __appRuntimeContext.updateLaunchSummary();
      __appRuntimeContext.showToast(`Added ${uploaded} session asset${uploaded === 1 ? "" : "s"}.`);
    }
  }

  function prepareThemeSessionFromSetup() {
    __appRuntimeContext.disableShowcaseDemo();
    const activeEvent = __appRuntimeContext.getActiveEvent();
    if (
      activeEvent &&
      activeEvent.eventType === "wedding" &&
      activeEvent.themeKey &&
      activeEvent.weddingTheme
    ) {
      __appRuntimeContext.setEventSelection(activeEvent.themeKey);
      __appRuntimeContext.loadTheme(activeEvent.themeKey);
      __appRuntimeContext.syncEventInputsFromActive();
      __appRuntimeContext.updateStylePreview();
      __appRuntimeContext.updateLaunchSummary();
      return true;
    }
    __appRuntimeContext.setActiveEventId("");
    __appRuntimeContext.setQuickStartSessionDate(__appRuntimeContext.getLocalIsoDate());
    const key =
      (__appRuntimeContext.DOM.createPathThemeSelect && __appRuntimeContext.DOM.createPathThemeSelect.value) ||
      __appRuntimeContext.getSelectedThemeKey() ||
      __appRuntimeContext.DEFAULT_THEME_KEY;
    const resolved = __appRuntimeContext.resolvePreferredThemeKey(key);
    if (!resolved) return false;
    if (__appRuntimeContext.DOM.eventProfileSelect) __appRuntimeContext.DOM.eventProfileSelect.value = "";
    __appRuntimeContext.setEventSelection(resolved);
    __appRuntimeContext.loadTheme(resolved);
    __appRuntimeContext.syncEventInputsFromActive();
    __appRuntimeContext.updateEventOverridesSummary();
    __appRuntimeContext.updateStylePreview();
    __appRuntimeContext.updateLaunchSummary();
    return true;
  }

  function quickStartThemeOnly(preferredThemeKey = "") {
    __appRuntimeContext.disableShowcaseDemo();
    const preferred =
      preferredThemeKey ||
      __appRuntimeContext.getLastThemeKey() ||
      __appRuntimeContext.getSelectedThemeKey() ||
      __appRuntimeContext.DEFAULT_THEME_KEY;
    const themeKey = __appRuntimeContext.resolvePreferredThemeKey(preferred);
    if (!themeKey) return;
    __appRuntimeContext.setActiveEventId("");
    if (__appRuntimeContext.DOM.eventProfileSelect) __appRuntimeContext.DOM.eventProfileSelect.value = "";
    __appRuntimeContext.setEventSelection(themeKey);
    __appRuntimeContext.setQuickStartSessionDate(__appRuntimeContext.getLocalIsoDate());
    __appRuntimeContext.loadTheme(themeKey);
    __appRuntimeContext.syncEventInputsFromActive();
    __appRuntimeContext.updateEventOverridesSummary();
    __appRuntimeContext.updateStylePreview();
    __appRuntimeContext.showToast("Quick start ready.");
    __appRuntimeContext.startBooth({ preserveSession: true });
  }

  function populateQuickStartThemeSelect() {
    if (!__appRuntimeContext.DOM.quickStartThemeSelect) return;
    const options = __appRuntimeContext.getThemeOptions();
    __appRuntimeContext.DOM.quickStartThemeSelect.innerHTML = "";
    options.forEach((opt) => {
      const next = document.createElement("option");
      next.value = opt.value;
      next.textContent = opt.textContent || opt.value;
      __appRuntimeContext.DOM.quickStartThemeSelect.appendChild(next);
    });
    const preferred =
      __appRuntimeContext.getLastThemeKey() ||
      __appRuntimeContext.getSelectedThemeKey() ||
      __appRuntimeContext.DEFAULT_THEME_KEY;
    const resolved = __appRuntimeContext.resolvePreferredThemeKey(preferred);
    if (resolved) __appRuntimeContext.DOM.quickStartThemeSelect.value = resolved;
  }

  function showQuickStartModal() {
    populateQuickStartThemeSelect();
    if (__appRuntimeContext.DOM.quickStartModal) __appRuntimeContext.DOM.quickStartModal.classList.add("show");
    if (__appRuntimeContext.DOM.quickStartThemeSelect) __appRuntimeContext.DOM.quickStartThemeSelect.focus();
  }

  function hideQuickStartModal() {
    if (__appRuntimeContext.DOM.quickStartModal) __appRuntimeContext.DOM.quickStartModal.classList.remove("show");
  }

  function confirmQuickStartFromModal() {
    const selected = __appRuntimeContext.DOM.quickStartThemeSelect
      ? __appRuntimeContext.DOM.quickStartThemeSelect.value
      : "";
    hideQuickStartModal();
    quickStartThemeOnly(selected);
  }

  return {
    populateCreatePathThemeSelect,
    getThemeOptionLabel,
    normalizeThemeSetupText,
    titleCaseThemeSetupText,
    getThemeSetupDisplayLabel,
    getThemeSetupDisplayGroup,
    getThemeSetupGroupIndex,
    getThemeSetupItemIndex,
    getSetupThemeEntries,
    getSessionThemeOptions,
    renderSessionThemeOptions,
    syncSessionThemeSearch,
    themeMatchesQuickFilter,
    getThemeQuickPreview,
    getThemeQuickMeta,
    renderThemeQuickPicker,
    resolveThemeKeyFromSearchValue,
    activateThemeFromSetupSearch,
    activateThemeFromSetupKey,
    getSetupComboboxParts,
    closeSetupCombobox,
    openSetupCombobox,
    toggleSetupCombobox,
    selectFirstVisibleComboboxOption,
    resetActiveSessionAssets,
    getSessionAssetUploadOptions,
    addSessionAssetUrl,
    selectSessionBackground,
    selectSessionOverlay,
    uploadCreatePathSessionAssets,
    prepareThemeSessionFromSetup,
    quickStartThemeOnly,
    populateQuickStartThemeSelect,
    showQuickStartModal,
    hideQuickStartModal,
    confirmQuickStartFromModal,
  };
}
