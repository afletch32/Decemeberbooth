# Asset System Analysis

**Context:** Ignoring offline mode. Single-user photobooth. No rewrites.

---

## 1. Why Built-in and Uploaded Assets Behave Differently

They were designed as two separate systems that never converged.

### Built-in assets flow:

```
Theme definition (app.js:136-466)
  → folder path like "assets/general/basic/overlays/"
  → getBuiltinAssetManifest(folder) (builtin-asset-manifests.mjs:274)
     reads BUILTIN_ASSET_MANIFESTS (hardcoded JS object, line 2)
  → returns array of {src, layout, slots, ...} or strings
  → rendered directly in the booth
```

### Uploaded assets flow:

```
File upload (POST /api/upload → server.js:562-584)
  → saved to uploads/ directory
  → user adds to library via POST /api/assets
  → stored in uploadedAssetLibrary global (app.js:1434)
  → persisted to localStorage key "photoboothAssetLibrary"
  → persisted to server file local-data/asset-library.json via POST/PATCH/DELETE /api/assets
  → blended into UI via getCanonicalAssetCollection()
  → rendered separately from built-in assets
```

**Why they behave differently:**

- Built-in assets are READ-ONLY. The `BUILTIN_ASSET_MANIFESTS` object in `builtin-asset-manifests.mjs` is never written to at runtime. There is no UI to remove an asset from a built-in manifest.
- Uploaded assets support CRUD: you can POST, PATCH (update metadata), and DELETE them through the `/api/assets` endpoints. But deletion is "soft" — it sets `hidden: true, archived: true` rather than actually removing the record.
- Built-in assets include template slot definitions (e.g., `{x: 50, y: 357, w: 500, h: 414}`). Uploaded assets have no slot data — they default to `layout: "double_column"` (line 13098 in app.js).
- The rendering code in `getLibraryOverlayEntries()` and `getLibraryTemplateEntries()` marks uploaded assets with `__library: true`, letting downstream code branch on source.

---

## 2. Every Place Assets Are Stored

| # | Store | Location | Format | Read/Write | Persistence |
|---|-------|----------|--------|------------|-------------|
| 1 | **BUILTIN_ASSET_MANIFESTS** | `builtin-asset-manifests.mjs:2-265` | JS object literal | Read-only at runtime | Committed to git |
| 2 | **Folder overlays.json/templates.json/backgrounds.json** | e.g. `assets/Hawks/overlays/overlays.json` | JSON files | Written by `tools/update-manifests.js`, read at runtime via `fetch()` | Committed to git, also runtime-overridable |
| 3 | **uploadedAssetLibrary global** | `app.js:1434` | JS object `{assets: [...]}` | Read/write in memory | Session only (backed by localStorage) |
| 4 | **localStorage key "photoboothAssetLibrary"** | Browser | JSON string | Written by `saveAssetLibraryLocal()` (app.js:12994), read by `loadAssetLibraryLocal()` (app.js:13001) | Cross-session |
| 5 | **Server file local-data/asset-library.json** | Server filesystem | JSON | Written by POST/PATCH/DELETE /api/assets (server.js:482-558) | Cross-session |
| 6 | **uploads/ directory** | Server filesystem | Image files | Written by POST /api/upload (server.js:562-584) | Cross-session |
| 7 | **Cloudflare KV** | Deployed | KV key-value | Written by functions/api/*.js | Cross-deployment |
| 8 | **Theme object folder references** | app.js:148, 167, etc. | Folder path strings | Read-only in theme defs | Committed to git |

---

## 3. Every Source of Truth for Assets

There are **five** independent sources of truth:

### Source A: Hardcoded JS manifest (`builtin-asset-manifests.mjs`)
- **What it knows:** Every built-in asset by folder (backgrounds, overlays, templates with slot geometry)
- **Authoritative for:** Template slot positions, overlay SVG metadata (aspect ratios, photo slots)
- **Only source of:** Template slot definitions for built-in themes

### Source B: Folder-level JSON files (`overlays.json`, `templates.json`, `backgrounds.json`)
- **What it knows:** File lists per asset folder
- **Authoritative for:** Runtime override when HTTP server is available
- **Evidence they ARE used:** Three functions in `app.js` fetch them at runtime

### Source C: `uploadedAssetLibrary` in-memory object + localStorage
- **What it knows:** User-uploaded assets with metadata (tags, category, editable fields)
- **Authoritative for:** User's custom assets
- **Problem:** Cache that can drift from server state

### Source D: Server API (`/api/assets`) + `local-data/asset-library.json`
- **What it knows:** Same as Source C but on the server
- **Authoritative for:** Cloudflare-synced state

### Source E: Server upload filesystem (`uploads/` directory)
- **What it knows:** Raw image files uploaded by user
- **Authoritative for:** The actual file bytes
- **Problem:** No relationship to Sources C/D — orphan files and orphan records can coexist

---

## 4. Every Code Path That References overlays.json, templates.json, backgrounds.json

There are **6 distinct references** across 4 files:

### Reference 1: `tools/update-manifests.js` — the WRITER (lines 75, 82, 92)

```js
// line 75 — overlays
const manifestPath = path.join(dir, "overlays.json");
// line 82 — templates
const manifestPath = path.join(dir, "templates.json");
// line 92 — backgrounds
const manifestPath = path.join(dir, "backgrounds.json");
```

**What it does:** Scans an asset folder (e.g., `assets/Hawks/overlays/`), finds image files, and writes the list to `overlays.json` inside that folder. For templates it preserves existing metadata (`layout`, `slots`). For backgrounds it writes a simple string array.

**Evidence it's the only writer:** There are no other files in the repo that write to these JSON filenames.

### Reference 2: `tools/update-manifests.test.js` — the TEST (lines 33, 47, 67, 91)

```js
// line 33
await fs.readFile(path.join(overlaysDir, "overlays.json"), "utf8")
// line 47
path.join(templatesDir, "templates.json")
// line 67
await fs.readFile(path.join(templatesDir, "templates.json"), "utf8")
// line 91
await fs.readFile(path.join(backgroundsDir, "backgrounds.json"), "utf8")
```

**What it does:** Verifies the tool output. Not a production code path.

### Reference 3: `overlay-slot-rendering.test.js` — the TEST (lines 31, 33)

```js
// line 31
"assets/wedding/timeless-romance/overlays/overlays.json"
// line 33
const garden = readProjectFile("assets/wedding/garden-vows/overlays/overlays.json");
```

**What it does:** Reads wedding overlay manifests as test fixtures. Not a production code path. Tests slot rendering logic.

### Reference 4: `overlay-maker.html` — DOCUMENTATION (lines 674-675)

```html
Single photo exports use `overlays.json`. Photo strip exports use `templates.json`.
```

**What it does:** Just text in the UI. Zero executable impact.

### Reference 5: `scripts/app.js` — `resolveBackgroundListFromFolder()` (line 18160)

```js
const manifestUrl = path + "backgrounds.json";
const resp = await fetch(manifestUrl, { cache: "reload" });
if (!resp.ok) return builtin;              // fallback to JS manifest
const json = await resp.json();
```

**What it does:** At runtime, fetches `backgrounds.json` from the server over HTTP. If the server returns it, those files are used. If the fetch fails (404, network error), falls back to the hardcoded JS manifest via `getBuiltinFolderStrings()` at line 18138.

### Reference 6: `scripts/app.js` — `resolveOverlaysFromFolder()` (lines 18343-18372)

```js
const url = folder + "overlays.json";
const resp = await fetch(url, { cache: "reload" });
if (!resp.ok) return fixOverlayEntries(builtin);  // fallback to JS manifest
const json = await resp.json();
```

**What it does:** Same pattern as backgrounds. Fetches `overlays.json`. Falls back to `getBuiltinOverlayEntries()` (which calls `getBuiltinAssetManifest()`).

### Reference 7: `scripts/app.js` — `resolveTemplatesFromFolder()` (lines 18376-18400+)

```js
const url = folder + "templates.json";
const resp = await fetch(url, { cache: "reload" });
if (!resp.ok) return builtin;              // fallback to JS manifest
const json = await resp.json();
```

**What it does:** Same pattern as the other two. Fetches `templates.json`. Falls back to `getBuiltinTemplateEntries()`.

---

## 5. The Full Three-File Loading Chain

```
resolveBackgroundListFromFolder(theme)
  → fetch("assets/general/basic/backgrounds/backgrounds.json")    // HTTP
  → if 404: getBuiltinFolderStrings("assets/general/basic/backgrounds/")
    → getBuiltinAssetManifest("assets/general/basic/backgrounds/")
      → BUILTIN_ASSET_MANIFESTS["assets/general/basic/backgrounds/"]  // JS object

resolveOverlaysFromFolder(theme)
  → fetch("assets/general/basic/overlays/overlays.json")          // HTTP
  → if 404: getBuiltinOverlayEntries("assets/general/basic/overlays/")
    → getBuiltinAssetManifest("assets/general/basic/overlays/")
      → BUILTIN_ASSET_MANIFESTS["assets/general/basic/overlays/"]  // JS object

resolveTemplatesFromFolder(theme)
  → fetch("assets/general/basic/templates/templates.json")       // HTTP
  → if 404: getBuiltinTemplateEntries("assets/general/basic/templates/")
    → getBuiltinAssetManifest("assets/general/basic/templates/")
      → BUILTIN_ASSET_MANIFESTS["assets/general/basic/templates/"]  // JS object
```

---

## 6. What Happens If builtin-asset-manifests.mjs Disappears

There are **6 direct callers** of functions exported by this module, plus **1 test file**. Here's the full impact analysis:

### 6.1 Callers of `getBuiltinAssetManifest()` (defined at line 274)

| Caller | File | Line | Role |
|--------|------|------|------|
| `getBuiltinFolderStrings()` | app.js | 17856 | Wraps manifest for background lists |
| `getBuiltinOverlayEntries()` | app.js | 17887 | Wraps manifest for overlay lists |
| `getBuiltinTemplateEntries()` | app.js | 17893 | Wraps manifest for template lists |
| `builtin-asset-manifests.test.js` | — | 14,27,37,40,56 | 4 test cases |

If `getBuiltinAssetManifest()` is removed, the three wrapper functions would throw ReferenceError.

### 6.2 Callers of `getBuiltinFolderStrings()` (line 17855)

| Caller | Line | Context | What happens on failure |
|--------|------|---------|------------------------|
| `resolveBackgroundList()` | 17538 | Sync resolver, called during theme setup. Built-in list is one of several sources merged via `mergeUniqueUrls()`. | Returns `[]` for the built-in source. Other sources (explicit, tmp, single) still contribute. |
| `resolveBackgroundListFromFolder()` | 18153 | Builds `builtin` variable before HTTP fetch attempt. Used as fallback if HTTP fetch fails. | Falls through to HTTP fetch. If HTTP also fails (404 or network), `builtin` will be undefined → `.slice()` throws at line 18153. |
| `resolveBackgroundListFromFolder()` catch block | 18178 | If entire function throws, this is the catch return. | `.slice()` on undefined would throw, then the catch at 18178 returns the result of `getBuiltinFolderStrings(path)` again — which would also throw. Uncaught. |

**Key call chain for background loading:**
```
resolveBackgroundListFromFolder(theme)
  → line 18153: const builtin = getBuiltinFolderStrings(path)        // BREAKS
  → line 18146: if (!http protocol) return builtin.slice()           // BREAKS before HTTP
  → line 18160: fetch(path + "backgrounds.json")                     // never reached on file://
  → line 18163: if (!resp.ok) return builtin                         // BREAKS
  → catch line 18178: return getBuiltinFolderStrings(path)           // BREAKS
```

### 6.3 Callers of `getBuiltinOverlayEntries()` (line 17886)

| Caller | Line | Context | What happens on failure |
|--------|------|---------|------------------------|
| `resolveOverlaysFromFolder()` | 18351 | Builds `builtin` before HTTP fetch | Same pattern as backgrounds |
| `resolveOverlaysFromFolder()` catch | 18372 | Fallback return | Same |
| `getOverlayList()` | 18431 | Related function | Would throw |
| `getBaseOverlayList()` | 18534 | Related function | Would throw |

### 6.4 Callers of `getBuiltinTemplateEntries()` (line 17892)

| Caller | Line | Context | What happens on failure |
|--------|------|---------|------------------------|
| `resolveTemplatesFromFolder()` | 18384 | Builds `builtin` before HTTP fetch | Same pattern |
| `resolveTemplatesFromFolder()` catch | 18410 | Fallback return | Same |

### 6.5 Complete breakage assessment

| Scenario | Manifest gone | Result |
|----------|---------------|--------|
| **Running locally via `npm start` (Express server, HTTP)** | Folder JSON files exist (generated by tool) | **BROWSER: Works.** HTTP fetch succeeds, app uses folder JSON files. JS manifest import line throws at module load time — `app.js` won't even execute. |
| **Running locally via `file://` protocol** | Folder JSON files exist but HTTP fetch is skipped | **BROKEN.** `getBuiltinFolderStrings()` is called before HTTP fetch; the HTTP branch is never entered because protocol check at line 18146 returns early. No built-in assets load. |
| **Running on Cloudflare Pages (deployed)** | Folder JSON files deployed as static assets | **BROKEN.** Same as local server — `import` from a missing module is a compile-time error. The entire app fails to load. |

### 6.6 Tests that would fail

| Test file | Tests | Lines |
|-----------|-------|-------|
| `builtin-asset-manifests.test.js` | All 4 tests | 14, 27, 37, 40, 56 |
| `overlay-slot-rendering.test.js` | NOT impacted — reads folder JSON files directly | 31, 33 |
| `tools/update-manifests.test.js` | NOT impacted — doesn't import the JS module | — |

### 6.7 Summary

| Question | Answer |
|----------|--------|
| **1. What breaks?** | The entire app. `app.js` imports `getBuiltinAssetManifest` at line 8 with a static `import`. Missing module = module load error = no JavaScript executes. |
| **2. What environments depend on it?** | **All environments.** It's the only data source for file:// protocol. For HTTP environments it's the fallback when folder JSON files don't exist — but since it's a static import, even environments where it wouldn't be needed can't load the app. |
| **3. Which runtime paths would still work?** | **None.** The static import at `app.js:8` prevents any code execution if the module doesn't exist. This isn't a runtime fallback question — it's a build-time failure. |
| **4. Which tests would fail?** | `builtin-asset-manifests.test.js` (4 tests). `overlay-slot-rendering.test.js` and `update-manifests.test.js` read folder JSON files directly so they pass. |
| **Could it be removed as a dependency?** | Yes, but only if the static import is replaced with a conditional import or the folder JSON files are promoted from "runtime override" to "primary source." Currently the manifest is a hard dependency of `app.js`, not an optional fallback. |

---

## 7. Why Asset Deletion Is Inconsistent

There are **three different deletion mechanisms** with different semantics:

### Deletion path 1: Soft-delete via PATCH or `archiveLibraryAssetByUrl()` (app.js:13193-13210)

```
archiveLibraryAssetByUrl(url)
  → updateAssetLibraryItem(id, {hidden: true, archived: true})
  → PATCH /api/assets {id, hidden: true, archived: true}
  → sets hidden=true, archived=true
  → asset stays in library forever, just filtered out of getVisibleLibraryAssets()
```

**Evidence:** `app.js:13193-13210` — always sets `archived: true`, never deletes. `getVisibleLibraryAssets()` at line 13013 filters out `asset.archived`.

### Deletion path 2: Hard-delete via DELETE /api/assets (server.js:541-558)

```
DELETE /api/assets { id }
  → filters asset out of library.assets[]
  → writes the filtered array back to asset-library.json
```

**Evidence:** `server.js:541-558` — actually removes from array. But the client-side `deleteAssetLibraryItem()` never calls this; it only calls PATCH with `archived: true`.

### Deletion path 3: Archive by URL via `archiveLibraryAssetByUrl()` (app.js:13182-13211)

**What it does:** Searches both `uploadedAssetLibrary.assets` and `getCanonicalAssetCollection()` for an asset matching the URL. But builtin assets are in `getCanonicalAssetCollection()` — the function returns but `updateAssetLibraryItem` won't find them in the library, so the builtin asset can't actually be hidden.

### The inconsistency:
- Client-side UI uses soft-delete (archived flag) — assets accumulate forever in localStorage
- Server supports hard-delete (filter out of array) — but the client never calls it
- Built-in assets can't be deleted at all — the function tries but `updateAssetLibraryItem` looks up by `id` in `uploadedAssetLibrary`, where built-in assets don't exist
- The `uploads/` filesystem is never cleaned up when an asset is deleted — orphan files accumulate

---

## 8. Smallest Change to Make All Assets Behave as One Unified System

**Do not merge the storage. Merge the read path only.**

The minimal viable change is 3 steps:

### Step 1: Make the three loading functions use only the folder JSON files (remove the JS manifest fallback)

The three functions `resolveBackgroundListFromFolder()`, `resolveOverlaysFromFolder()`, and `resolveTemplatesFromFolder()` currently:
1. Try HTTP fetch of folder JSON file
2. Fall back to hardcoded JS manifest

Change them to remove the JS manifest fallback. The folder JSON files are always present (generated by the tool and committed to git), so the HTTP fetch will always succeed when served via HTTP. For file:// protocol, the JS manifest is still needed as a direct data source.

**But there's a catch:** The `import` at `app.js:8` is a static import — removing the module would prevent the app from loading. So instead of deleting the manifest, we flip the priority: folder JSON becomes primary, JS manifest becomes a last-resort fallback only for file:// protocol.

**Actually, the simplest change:** Remove the HTTP fetch entirely and use ONLY the JS manifest. This makes the JS manifest the single source of truth. The folder JSON files become dead and can be deleted.

### Step 2: Remove the folder JSON files and the tool that writes them

Delete all `overlays.json`, `templates.json`, `backgrounds.json` from every `assets/*/*/` folder. Delete or gut `tools/update-manifests.js`. Delete the duplicate `assets-to-themes-script/`.

### Step 3: Make `deleteAssetLibraryItem()` call actual DELETE for uploaded assets

Currently `deleteAssetLibraryItem()` calls PATCH with `{archived: true}`. Change it to call `DELETE /api/assets` for uploaded assets and do nothing for built-in assets (they're read-only). Remove the soft-delete path entirely.