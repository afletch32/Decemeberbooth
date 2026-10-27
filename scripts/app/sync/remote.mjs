export function createRemoteModule(__appRuntimeContext) {
  function resolveRemoteSyncOverride() {
    try {
      if (typeof window !== "undefined") {
        if (typeof window.PHOTOBOOTH_REMOTE_SYNC === "boolean")
          return window.PHOTOBOOTH_REMOTE_SYNC;
        const stored = localStorage.getItem("photoboothRemoteSync");
        if (stored === "true") return true;
        if (stored === "false") return false;
      }
    } catch (_) {}
    return null;
  }

  function canSyncRemote() {
    if (typeof location === "undefined") return false;
    const protocol = (location && location.protocol) || "";
    const host =
      (location && location.hostname && location.hostname.toLowerCase()) || "";
    if (!protocol.startsWith("http")) return false;
    const override = resolveRemoteSyncOverride();
    return __appRuntimeContext.shouldEnableRemoteSync({ protocol, host, override });
  }

  async function loadThemesRemote() {
    if (!canSyncRemote()) return;
    try {
      const resp = await fetch("/api/themes", { cache: "no-store" });
      if (!resp.ok) return;
      const remote = await resp.json();
      const repairedOverlayDefaults =
        __appRuntimeContext.hasCorruptedThemeOverlayEntries(remote);
      const hasKeys =
        remote && typeof remote === "object" && Object.keys(remote).length > 0;
      if (!hasKeys) {
        // Do not clobber built-in themes with an empty server payload
        updateSyncStatus("Using built-in themes");
        return;
      }
      // Merge server themes over built-ins/local
      __appRuntimeContext.mergeStoredThemes(__appRuntimeContext.themes, remote);
      __appRuntimeContext.fixBuiltinThemePlacements(__appRuntimeContext.themes);
      const removedUnapprovedBuiltinThemes = __appRuntimeContext.ensureBuiltinThemes();
      __appRuntimeContext.refreshBeautyPresetEffects();
      if (!__appRuntimeContext.hasCoreBuiltins(__appRuntimeContext.themes)) {
        __appRuntimeContext.resetThemesToBuiltins("remote themes missing core entries");
      }
      try {
        __appRuntimeContext.normalizeAllThemes();
      } catch (_e) {}
      const removedLegacyThemes = __appRuntimeContext.removeLegacyFlatBuiltinThemes();
      const migratedAveryScreens = __appRuntimeContext.migrateOptimizedAveryScreenAssets(__appRuntimeContext.themes);
      const migratedAmandaNorthScreens = __appRuntimeContext.migrateAmandaNorthScreenAssets(__appRuntimeContext.themes);
      const migratedSummerAssets = __appRuntimeContext.migrateSummerThemeAssets(__appRuntimeContext.themes);
      const migratedHalloweenAssets = __appRuntimeContext.migrateHalloweenThemeAssets(__appRuntimeContext.themes);
      const migratedSpringHillHawks = __appRuntimeContext.migrateSpringHillHawksAssets(__appRuntimeContext.themes);
      const migratedSpringHillHawksStadium =
        __appRuntimeContext.migrateSpringHillHawksStadiumAssets(__appRuntimeContext.themes);
      const migratedSpringHillHawksCheer =
        __appRuntimeContext.migrateSpringHillHawksCheerAssets(__appRuntimeContext.themes);
      const repairedBackgroundDefaults = __appRuntimeContext.repairCorruptedBackgroundDefaults();
      const globalLogo = __appRuntimeContext.getGlobalLogo();
      if (globalLogo !== null) __appRuntimeContext.applyGlobalLogoToAllThemes(globalLogo);
      localStorage.setItem("photoboothThemes", JSON.stringify(__appRuntimeContext.themes));
      if (
        repairedBackgroundDefaults ||
        repairedOverlayDefaults ||
        removedUnapprovedBuiltinThemes ||
        removedLegacyThemes ||
        migratedAveryScreens ||
        migratedAmandaNorthScreens ||
        migratedSummerAssets ||
        migratedHalloweenAssets ||
        migratedSpringHillHawks ||
        migratedSpringHillHawksStadium ||
        migratedSpringHillHawksCheer
      )
        scheduleThemesRemoteSync();
      // Refresh UI if already initialized
      const selected = __appRuntimeContext.populateThemeSelector(__appRuntimeContext.getStartupThemeKey());
      if (selected) {
        __appRuntimeContext.loadTheme(selected);
      }
      __appRuntimeContext.renderThemeQuickPicker();
      updateSyncStatus("Synced from server");
    } catch (_) {}
  }

  function hasStoredEventsPayload(payload) {
    return !!(
      payload &&
      typeof payload === "object" &&
      Array.isArray(payload.events)
    );
  }

  function getStoredEventsPayload() {
    return {
      events: __appRuntimeContext.getStoredEvents(),
      activeEventId: __appRuntimeContext.getActiveEventId(),
    };
  }

  function normalizeEventsRemotePayload(payload) {
    if (Array.isArray(payload)) {
      return { events: payload, activeEventId: "" };
    }
    if (!payload || typeof payload !== "object") {
      return { events: [], activeEventId: "" };
    }
    return {
      events: Array.isArray(payload.events) ? payload.events : [],
      activeEventId:
        typeof payload.activeEventId === "string" ? payload.activeEventId : "",
    };
  }

  async function loadEventsRemote() {
    if (!canSyncRemote()) return;
    try {
      const resp = await fetch("/api/events", { cache: "no-store" });
      if (!resp.ok) return;
      const remote = normalizeEventsRemotePayload(await resp.json());
      const local = getStoredEventsPayload();
      const remoteEmpty = !remote.events.length && !remote.activeEventId;
      if (remoteEmpty && (local.events.length || local.activeEventId)) {
        updateSyncStatus("Using local events");
        return;
      }
      __appRuntimeContext.setStoredEvents(remote.events, { skipRemoteSync: true });
      const resolvedActiveId =
        remote.activeEventId &&
        remote.events.some((event) => event && event.id === remote.activeEventId)
          ? remote.activeEventId
          : "";
      __appRuntimeContext.setActiveEventId(resolvedActiveId, { skipRemoteSync: true });
      __appRuntimeContext.populateEventProfileSelect(resolvedActiveId);
      const activeEvent = __appRuntimeContext.getActiveEvent();
      __appRuntimeContext.syncEventPrintPriceInput();
      __appRuntimeContext.loadPayPalPrintConfigStatus();
      if (activeEvent && activeEvent.themeKey) {
        __appRuntimeContext.setEventSelection(activeEvent.themeKey);
        __appRuntimeContext.loadTheme(activeEvent.themeKey);
      } else {
        __appRuntimeContext.syncEventInputsFromActive();
        __appRuntimeContext.updateStylePreview();
      }
      updateSyncStatus("Events synced from server");
    } catch (_) {}
  }

  async function syncThemesRemote() {
    if (!canSyncRemote()) return false;
    try {
      const response = await fetch("/api/themes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(__appRuntimeContext.themes),
      });
      return response.ok;
    } catch (_) {
      return false;
    }
  }

  function scheduleThemesRemoteSync() {
    if (!canSyncRemote()) return;
    if (__appRuntimeContext.pendingThemesSyncTimer) clearTimeout(__appRuntimeContext.pendingThemesSyncTimer);
    __appRuntimeContext.pendingThemesSyncTimer = setTimeout(() => {
      __appRuntimeContext.pendingThemesSyncTimer = null;
      syncThemesRemote().catch(() => {});
    }, __appRuntimeContext.REMOTE_SYNC_DEBOUNCE_MS);
  }

  async function syncEventsRemote() {
    if (!canSyncRemote()) return false;
    try {
      const response = await fetch("/api/events", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getStoredEventsPayload()),
      });
      return response.ok;
    } catch (_) {
      return false;
    }
  }

  function scheduleEventsRemoteSync() {
    if (!canSyncRemote()) return;
    if (__appRuntimeContext.pendingEventsSyncTimer) clearTimeout(__appRuntimeContext.pendingEventsSyncTimer);
    __appRuntimeContext.pendingEventsSyncTimer = setTimeout(() => {
      __appRuntimeContext.pendingEventsSyncTimer = null;
      syncEventsRemote().catch(() => {});
    }, __appRuntimeContext.REMOTE_SYNC_DEBOUNCE_MS);
  }

  function mergeFonts(a, b) {
    const out = [];
    const seen = new Set();
    [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])].forEach(
      (f) => {
        try {
          const k = JSON.stringify(f);
          if (!seen.has(k)) {
            seen.add(k);
            out.push(f);
          }
        } catch (_) {}
      }
    );
    return out;
  }

  async function loadFontsRemote() {
    if (!canSyncRemote()) return [];
    try {
      const r = await fetch("/api/fonts", { cache: "no-store" });
      if (!r.ok) return [];
      const data = await r.json();
      if (Array.isArray(data)) return data;
      const normalized = normalizeFontsPayload(data);
      if (normalized && Array.isArray(normalized.available)) {
        return normalized.available.map((font) => ({
          type: "family",
          value: font.name,
          weights: font.weights,
        }));
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  async function syncFontsRemote(fonts) {
    if (!canSyncRemote()) return;
    try {
      await fetch("/api/fonts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fonts || []),
      });
    } catch (_) {}
  }

  function scheduleFontsRemoteSync(fonts) {
    if (!canSyncRemote()) return;
    __appRuntimeContext.pendingFontsSyncPayload = Array.isArray(fonts) ? fonts.slice() : [];
    if (__appRuntimeContext.pendingFontsSyncTimer) clearTimeout(__appRuntimeContext.pendingFontsSyncTimer);
    __appRuntimeContext.pendingFontsSyncTimer = setTimeout(() => {
      __appRuntimeContext.pendingFontsSyncTimer = null;
      const payload = __appRuntimeContext.pendingFontsSyncPayload;
      __appRuntimeContext.pendingFontsSyncPayload = null;
      syncFontsRemote(payload).catch(() => {});
    }, __appRuntimeContext.REMOTE_SYNC_DEBOUNCE_MS);
  }

  async function syncAssetLibraryRemote() {
    if (!canSyncRemote()) return;
    for (const asset of __appRuntimeContext.assetLibrary.assets || []) {
      await __appRuntimeContext.syncAssetLibraryRemoteAsset(asset);
    }
  }

  function updateSyncStatus(text) {
    if (__appRuntimeContext.DOM.syncStatus) __appRuntimeContext.DOM.syncStatus.textContent = text || "";
  }

  async function syncNow() {
    if (!canSyncRemote()) {
      alert("Remote sync is unavailable on this host.");
      return;
    }
    try {
      updateSyncStatus("Syncing…");
      // Push current local themes, events, and fonts
      await syncThemesRemote();
      await syncEventsRemote();
      await syncFontsRemote(__appRuntimeContext.getStoredFonts());
      await syncAssetLibraryRemote();
      // Reload from server to confirm and merge
      await loadThemesRemote();
      await loadEventsRemote();
      await __appRuntimeContext.loadAssetLibraryRemote();
      const remoteFonts = await loadFontsRemote();
      if (Array.isArray(remoteFonts) && remoteFonts.length) {
        const merged = mergeFonts(__appRuntimeContext.getStoredFonts(), remoteFonts);
        localStorage.setItem("photoboothFonts", JSON.stringify(merged));
      }
      updateSyncStatus("Synced ✓");
      __appRuntimeContext.showToast("Sync complete");
    } catch (e) {
      console.error("Sync failed", e);
      updateSyncStatus("Sync failed");
      alert("Sync failed. Check network and Cloudflare bindings.");
    }
  }

  async function ensureRemoteSeed() {
    if (!canSyncRemote()) return;
    try {
      if (localStorage.getItem("kvSeeded") === "true") return;
      const [tRes, eRes, fRes, aRes] = await Promise.all([
        fetch("/api/themes", { cache: "no-store" }),
        fetch("/api/events", { cache: "no-store" }),
        fetch("/api/fonts", { cache: "no-store" }),
        fetch("/api/assets", { cache: "no-store" }),
      ]);
      let needSeed = false;
      if (tRes.ok) {
        const t = await tRes.text();
        if (!t || t.trim() === "" || t.trim() === "{}") needSeed = true;
      }
      if (eRes.ok) {
        const e = await eRes.text();
        if (
          !e ||
          e.trim() === "" ||
          e.trim() === "{}" ||
          e.trim() === '{"events":[],"activeEventId":""}'
        )
          needSeed = true;
      }
      if (fRes.ok) {
        const f = await fRes.text();
        if (!f || f.trim() === "" || f.trim() === "[]") needSeed = true;
      }
      if (aRes.ok) {
        const a = await aRes.text();
        if (!a || a.trim() === "" || a.trim() === '{"assets":[]}') needSeed = true;
      }
      if (needSeed) {
        await syncThemesRemote();
        await syncEventsRemote();
        await syncFontsRemote(__appRuntimeContext.getStoredFonts());
        await syncAssetLibraryRemote();
        localStorage.setItem("kvSeeded", "true");
        updateSyncStatus("Seeded to server");
      }
    } catch (_) {}
  }

  function getEmailJsConfig() {
    const service =
      localStorage.getItem("emailJsService") || __appRuntimeContext.EMAILJS_SERVICE_ID_DEFAULT;
    const template =
      localStorage.getItem("emailJsTemplate") || __appRuntimeContext.EMAILJS_TEMPLATE_ID_DEFAULT;
    const pub =
      localStorage.getItem("emailJsPublic") || __appRuntimeContext.EMAILJS_PUBLIC_KEY_DEFAULT;
    return { service, template, pub };
  }

  function loadEmailJsSettings() {
    if (__appRuntimeContext.DOM.emailJsPublic)
      __appRuntimeContext.DOM.emailJsPublic.value = localStorage.getItem("emailJsPublic") || "";
    if (__appRuntimeContext.DOM.emailJsService)
      __appRuntimeContext.DOM.emailJsService.value = localStorage.getItem("emailJsService") || "";
    if (__appRuntimeContext.DOM.emailJsTemplate)
      __appRuntimeContext.DOM.emailJsTemplate.value = localStorage.getItem("emailJsTemplate") || "";
  }

  async function ensureEmailJsClient() {
    if (__appRuntimeContext.emailJsClientPromise) return __appRuntimeContext.emailJsClientPromise;
    __appRuntimeContext.emailJsClientPromise = __appRuntimeContext.loadEmailJsLibrary().then((client) => {
      const cfg = getEmailJsConfig();
      try {
        client.init({ publicKey: cfg.pub });
      } catch (_) {
        client.init(cfg.pub);
      }
      return client;
    });
    try {
      return await __appRuntimeContext.emailJsClientPromise;
    } catch (error) {
      __appRuntimeContext.emailJsClientPromise = null;
      throw error;
    }
  }

  function saveEmailJsSettings() {
    if (__appRuntimeContext.DOM.emailJsPublic)
      localStorage.setItem(
        "emailJsPublic",
        (__appRuntimeContext.DOM.emailJsPublic.value || "").trim()
      );
    if (__appRuntimeContext.DOM.emailJsService)
      localStorage.setItem(
        "emailJsService",
        (__appRuntimeContext.DOM.emailJsService.value || "").trim()
      );
    if (__appRuntimeContext.DOM.emailJsTemplate)
      localStorage.setItem(
        "emailJsTemplate",
        (__appRuntimeContext.DOM.emailJsTemplate.value || "").trim()
      );
    __appRuntimeContext.emailJsClientPromise = null;
    __appRuntimeContext.showToast("Email settings saved");
  }

  async function sendTestEmail() {
    const cfg = getEmailJsConfig();
    const to = prompt("Send test to (email):");
    if (!to) return;
    const tiny =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAtEB6m3W1NoAAAAASUVORK5CYII=";
    const params = {
      to_email: to,
      photo_url: tiny,
      link_url: "",
      image_data_url: tiny,
    };
    try {
      const client = await ensureEmailJsClient();
      await client.send(cfg.service, cfg.template, params);
      alert("Test email sent");
    } catch (e) {
      const details = e && (e.text || e.message || e.status || JSON.stringify(e));
      console.error("EmailJS test failed", e);
      alert("Test failed: " + (details || "unknown error"));
    }
  }

  return {
    resolveRemoteSyncOverride,
    canSyncRemote,
    loadThemesRemote,
    hasStoredEventsPayload,
    getStoredEventsPayload,
    normalizeEventsRemotePayload,
    loadEventsRemote,
    syncThemesRemote,
    scheduleThemesRemoteSync,
    syncEventsRemote,
    scheduleEventsRemoteSync,
    mergeFonts,
    loadFontsRemote,
    syncFontsRemote,
    scheduleFontsRemoteSync,
    syncAssetLibraryRemote,
    updateSyncStatus,
    syncNow,
    ensureRemoteSeed,
    getEmailJsConfig,
    loadEmailJsSettings,
    ensureEmailJsClient,
    saveEmailJsSettings,
    sendTestEmail,
  };
}
