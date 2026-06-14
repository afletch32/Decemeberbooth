#!/usr/bin/env node
/**
 * Photobooth Production - Local Development Server
 * Serves static files and provides API endpoints for settings and uploads
 * Accessible from other devices on the same network
 */

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 8000;
const HOST = process.env.HOST || "0.0.0.0";
const DATA_ROOT = process.env.DATA_ROOT || __dirname;
const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES || 15 * 1024 * 1024);
const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml'
]);

// Directories
const LOCAL_DATA_DIR = path.join(DATA_ROOT, 'local-data');
const UPLOADS_DIR = path.join(DATA_ROOT, 'uploads');

// Ensure directories exist
[LOCAL_DATA_DIR, UPLOADS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.text());

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    // Keep original filename with timestamp prefix to avoid conflicts
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}-${safeName}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_UPLOAD_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error(`Unsupported upload type: ${file.mimetype || 'unknown'}`));
  }
});

// Default fonts payload (from functions/api/fonts.js)
const DEFAULT_FONTS_PAYLOAD = {
  available: [
    { name: 'Comic Neue', weights: [400, 700], preview: 'Welcome to the celebration!' },
    { name: 'Creepster', weights: [400], preview: 'Spooky season starts now!' },
    { name: 'Nosifer', weights: [400], preview: 'Dripping thrills at Fletch Photobooth!' },
    { name: 'Montserrat', weights: [400, 600, 700], preview: 'Modern, clean, and easy to read.' },
    { name: 'Bangers', weights: [400], preview: "Let's make some noise tonight!" },
    { name: 'Great Vibes', weights: [400], preview: 'Love is in the air.' }
  ],
  defaults: {
    heading: 'Comic Neue',
    body: 'Montserrat'
  },
  pairings: [
    { heading: 'Creepster', body: 'Comic Neue', notes: 'Halloween ready mix', preview: 'Spooky season starts now!' },
    { heading: 'Nosifer', body: 'Inter', notes: 'Dripping horror headline', preview: 'Dripping thrills at Fletch Photobooth!' },
    { heading: 'Bangers', body: 'Montserrat', notes: 'Bold energy + legible copy', preview: "Let's make some noise tonight!" },
    { heading: 'Great Vibes', body: 'Montserrat', notes: 'Romantic headline with modern body', preview: 'Love is in the air.' }
  ]
};

// Helper: Get local network IP addresses
function getNetworkAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }

  return addresses;
}

// Helper: Read JSON file
function readJsonFile(filename, defaultValue = {}) {
  const filepath = path.join(LOCAL_DATA_DIR, filename);
  try {
    if (fs.existsSync(filepath)) {
      const content = fs.readFileSync(filepath, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.warn(`Failed to read ${filename}, using default:`, err.message);
  }
  return defaultValue;
}

// Helper: Write JSON file
function writeJsonFile(filename, data) {
  const filepath = path.join(LOCAL_DATA_DIR, filename);
  const tempPath = `${filepath}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tempPath, filepath);
}

function normalizeGalleryTag(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function normalizeGalleryPayload(payload, tag) {
  const resources = Array.isArray(payload && payload.resources)
    ? payload.resources
    : [];
  return {
    tag,
    title: String((payload && payload.title) || ""),
    resources: resources
      .map((item) => {
        const url = String((item && (item.secure_url || item.url)) || "").trim();
        if (!/^https?:\/\//i.test(url)) return null;
        const resourceType =
          item && (item.resource_type === "video" || item.type === "video")
            ? "video"
            : "image";
        return {
          capture_id: String((item && item.capture_id) || ""),
          secure_url: url,
          url,
          created_at: String((item && item.created_at) || ""),
          resource_type: resourceType,
          type: resourceType,
          mode: String((item && item.mode) || ""),
        };
      })
      .filter(Boolean),
  };
}

const VALID_ASSET_CATEGORIES = new Set(["background", "overlay", "template"]);

function normalizeAssetCategory(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "backgrounds" || raw === "greenbackgrounds") return "background";
  if (raw === "overlays") return "overlay";
  if (raw === "templates") return "template";
  return VALID_ASSET_CATEGORIES.has(raw) ? raw : "";
}

function isManageableAssetUrl(value) {
  const url = String(value || "").trim();
  if (!url) return false;
  if (/^(javascript|vbscript):/i.test(url)) return false;
  return true;
}

function normalizeAssetTags(value) {
  const source = Array.isArray(value)
    ? value
    : String(value || "")
        .split(",")
        .map((tag) => tag.trim());
  const seen = new Set();
  const out = [];
  source.forEach((tag) => {
    const clean = String(tag || "").trim().toLowerCase();
    if (!clean || seen.has(clean)) return;
    seen.add(clean);
    out.push(clean);
  });
  return out;
}

const VALID_ASSET_EDITABLE_FIELDS = new Set([
  "eventName",
  "date",
  "schoolName",
  "title",
  "subtitle",
  "buttonText",
  "bannerText",
]);

const ASSET_EDITABLE_FIELD_ALIASES = {
  event: "eventName",
  eventname: "eventName",
  name: "eventName",
  date: "date",
  school: "schoolName",
  schoolname: "schoolName",
  title: "title",
  subtitle: "subtitle",
  button: "buttonText",
  buttonlabel: "buttonText",
  buttontext: "buttonText",
  banner: "bannerText",
  bannertext: "bannerText",
};

function normalizeEditableFields(value) {
  const source = Array.isArray(value)
    ? value
    : String(value || "")
        .split(",")
        .map((field) => field.trim());
  const seen = new Set();
  const out = [];
  source.forEach((field) => {
    const raw = String(field || "").trim();
    const compact = raw.replace(/[\s_-]+/g, "").toLowerCase();
    const clean = VALID_ASSET_EDITABLE_FIELDS.has(raw)
      ? raw
      : ASSET_EDITABLE_FIELD_ALIASES[compact] || "";
    if (!clean || seen.has(clean)) return;
    seen.add(clean);
    out.push(clean);
  });
  return out;
}

function normalizeAssetRecord(item) {
  if (!item || typeof item !== "object") return null;
  const url = String(item.url || item.secure_url || item.src || "").trim();
  if (!isManageableAssetUrl(url)) return null;
  const category = normalizeAssetCategory(item.category || item.kind);
  if (!category) return null;
  const id = String(item.id || `${category}:${url}`).trim();
  const editableFields = normalizeEditableFields(item.editableFields);
  return {
    id,
    category,
    url,
    secure_url: url,
    name: String(item.name || item.originalName || path.basename(url) || category).trim(),
    tags: normalizeAssetTags(item.tags),
    folder: String(item.folder || "").trim(),
    hash: String(item.hash || "").trim(),
    contentType: String(item.contentType || item.type || "").trim(),
    createdAt: String(item.createdAt || item.created_at || new Date().toISOString()),
    updatedAt: String(item.updatedAt || item.updated_at || new Date().toISOString()),
    customizable:
      item.customizable === true ||
      (item.customizable !== false && editableFields.length > 0),
    editableFields,
    archived: item.archived === true,
    hidden: item.hidden === true || item.archived === true,
  };
}

function normalizeAssetLibraryPayload(payload) {
  const assets = Array.isArray(payload && payload.assets)
    ? payload.assets
    : Array.isArray(payload)
      ? payload
      : [];
  const byId = new Map();
  assets.map(normalizeAssetRecord).filter(Boolean).forEach((asset) => {
    byId.set(asset.id, asset);
  });
  return {
    assets: Array.from(byId.values()).sort((a, b) =>
      String(b.createdAt).localeCompare(String(a.createdAt))
    ),
  };
}

function readGalleryIndex() {
  return readJsonFile("gallery-index.json", {});
}

function writeGalleryIndex(index) {
  writeJsonFile("gallery-index.json", index && typeof index === "object" ? index : {});
}

function resolveUploadFilepath(reference) {
  if (typeof reference !== "string" || !reference.trim()) return null;
  let pathname = "";
  try {
    pathname = new URL(reference, "http://localhost").pathname || "";
  } catch (_err) {
    return null;
  }
  if (!pathname.startsWith("/uploads/")) return null;
  const filename = decodeURIComponent(pathname.slice("/uploads/".length));
  if (!filename || filename !== path.basename(filename) || filename === "." || filename === "..") {
    return null;
  }
  return path.join(UPLOADS_DIR, filename);
}

// API: GET /api/health
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    app: 'photobooth-production',
    time: new Date().toISOString(),
    dataRoot: DATA_ROOT
  });
});

// API: GET /api/fonts
app.get('/api/fonts', (req, res) => {
  try {
    const fonts = readJsonFile('fonts.json', DEFAULT_FONTS_PAYLOAD);
    res.json(fonts);
  } catch (err) {
    console.error('Error reading fonts:', err);
    res.status(500).json({ error: err.message });
  }
});

// API: PUT /api/fonts
app.put('/api/fonts', (req, res) => {
  try {
    const data = req.body;
    writeJsonFile('fonts.json', data);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error saving fonts:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// API: GET /api/themes
app.get('/api/themes', (req, res) => {
  try {
    const themes = readJsonFile('themes.json', {});
    res.json(themes);
  } catch (err) {
    console.error('Error reading themes:', err);
    res.status(500).json({ error: err.message });
  }
});

// API: PUT /api/themes
app.put('/api/themes', (req, res) => {
  try {
    const data = req.body;
    writeJsonFile('themes.json', data);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error saving themes:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// API: GET /api/events
app.get('/api/events', (req, res) => {
  try {
    const events = readJsonFile('events.json', { events: [], activeEventId: '' });
    if (Array.isArray(events)) {
      res.json({ events, activeEventId: '' });
      return;
    }
    res.json({
      events: Array.isArray(events.events) ? events.events : [],
      activeEventId: typeof events.activeEventId === 'string' ? events.activeEventId : ''
    });
  } catch (err) {
    console.error('Error reading events:', err);
    res.status(500).json({ error: err.message });
  }
});

// API: PUT /api/events
app.put('/api/events', (req, res) => {
  try {
    const data = req.body;
    const payload = Array.isArray(data)
      ? { events: data, activeEventId: '' }
      : {
          events: Array.isArray(data && data.events) ? data.events : [],
          activeEventId: typeof (data && data.activeEventId) === 'string' ? data.activeEventId : ''
        };
    writeJsonFile('events.json', payload);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error saving events:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// API: GET/POST /api/gallery (public gallery index, independent of Cloudinary list mode)
app.get('/api/gallery', (req, res) => {
  try {
    const tag = normalizeGalleryTag(req.query && req.query.tag);
    if (!tag) return res.status(400).json({ ok: false, error: "Missing gallery tag." });
    const index = readGalleryIndex();
    res.json(normalizeGalleryPayload(index[tag], tag));
  } catch (err) {
    console.error('Error reading gallery index:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/gallery', (req, res) => {
  try {
    const tag = normalizeGalleryTag(req.query && req.query.tag);
    if (!tag) return res.status(400).json({ ok: false, error: "Missing gallery tag." });
    const url = String((req.body && (req.body.secure_url || req.body.url)) || "").trim();
    if (!/^https?:\/\//i.test(url)) {
      return res.status(400).json({ ok: false, error: "Invalid gallery photo URL." });
    }
    const index = readGalleryIndex();
    const existing = normalizeGalleryPayload(index[tag], tag);
    const nextResource = {
      capture_id: String((req.body && req.body.capture_id) || ""),
      secure_url: url,
      url,
      created_at: String((req.body && req.body.created_at) || new Date().toISOString()),
      resource_type:
        req.body && (req.body.resource_type === "video" || req.body.type === "video")
          ? "video"
          : "image",
      type:
        req.body && (req.body.resource_type === "video" || req.body.type === "video")
          ? "video"
          : "image",
      mode: String((req.body && req.body.mode) || ""),
    };
    const resources = [
      nextResource,
      ...existing.resources.filter(
        (item) =>
          item &&
          item.secure_url !== url &&
          item.url !== url &&
          (!nextResource.capture_id ||
            item.capture_id !== nextResource.capture_id)
      ),
    ].slice(0, 500);
    index[tag] = {
      tag,
      title: String((req.body && req.body.title) || existing.title || ""),
      resources,
    };
    writeGalleryIndex(index);
    res.json({ ok: true, count: resources.length });
  } catch (err) {
    console.error('Error saving gallery index:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// API: GET/POST/PATCH/DELETE /api/assets (persistent uploaded asset library)
app.get('/api/assets', (req, res) => {
  try {
    res.json(normalizeAssetLibraryPayload(readJsonFile('asset-library.json', { assets: [] })));
  } catch (err) {
    console.error('Error reading asset library:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/assets', (req, res) => {
  try {
    const incoming = normalizeAssetRecord(req.body);
    if (!incoming) {
      return res.status(400).json({ ok: false, error: 'Invalid asset payload.' });
    }
    const library = normalizeAssetLibraryPayload(readJsonFile('asset-library.json', { assets: [] }));
    const existingIndex = library.assets.findIndex(
      (asset) => asset.id === incoming.id || asset.url === incoming.url
    );
    if (existingIndex >= 0) {
      const existing = library.assets[existingIndex];
      library.assets[existingIndex] = {
        ...existing,
        ...incoming,
        tags: normalizeAssetTags([...(existing.tags || []), ...(incoming.tags || [])]),
        archived: incoming.archived === true ? true : existing.archived === true,
        hidden:
          incoming.hidden === true ||
          incoming.archived === true ||
          existing.hidden === true ||
          existing.archived === true,
        createdAt: existing.createdAt || incoming.createdAt,
        updatedAt: new Date().toISOString(),
      };
    } else {
      library.assets.unshift(incoming);
    }
    const next = normalizeAssetLibraryPayload(library);
    writeJsonFile('asset-library.json', next);
    res.json({ ok: true, asset: incoming, count: next.assets.length });
  } catch (err) {
    console.error('Error saving asset library:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.patch('/api/assets', (req, res) => {
  try {
    const id = String((req.body && req.body.id) || '').trim();
    const url = String((req.body && req.body.url) || '').trim();
    if (!id && !url) return res.status(400).json({ ok: false, error: 'Missing asset id.' });
    const library = normalizeAssetLibraryPayload(readJsonFile('asset-library.json', { assets: [] }));
    const index = library.assets.findIndex((asset) => asset.id === id || asset.url === url);
    if (index < 0) return res.status(404).json({ ok: false, error: 'Asset not found.' });
    library.assets[index] = normalizeAssetRecord({
      ...library.assets[index],
      ...req.body,
      updatedAt: new Date().toISOString(),
    });
    const next = normalizeAssetLibraryPayload(library);
    writeJsonFile('asset-library.json', next);
    res.json({ ok: true, count: next.assets.length });
  } catch (err) {
    console.error('Error updating asset library:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.delete('/api/assets', (req, res) => {
  try {
    const id = String((req.body && req.body.id) || '').trim();
    const url = String((req.body && req.body.url) || '').trim();
    if (!id && !url) return res.status(400).json({ ok: false, error: 'Missing asset id.' });
    const library = normalizeAssetLibraryPayload(readJsonFile('asset-library.json', { assets: [] }));
    const nextAssets = library.assets.filter((asset) => asset.id !== id && asset.url !== url);
    if (nextAssets.length === library.assets.length) {
      return res.status(404).json({ ok: false, error: 'Asset not found.' });
    }
    const next = normalizeAssetLibraryPayload({ assets: nextAssets });
    writeJsonFile('asset-library.json', next);
    res.json({ ok: true, count: next.assets.length });
  } catch (err) {
    console.error('Error deleting asset library item:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// API: POST /api/upload (file upload)
app.post('/api/upload', (req, res) => {
  upload.single('file')(req, res, err => {
    try {
      if (err) {
        return res.status(400).json({ ok: false, error: err.message });
      }
      if (!req.file) {
        return res.status(400).json({ ok: false, error: 'No file uploaded' });
      }

      // Return the URL path to the uploaded file
      const fileUrl = `/uploads/${req.file.filename}`;
      res.json({
        ok: true,
        url: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size
      });
    } catch (uploadErr) {
      console.error('Error uploading file:', uploadErr);
      res.status(500).json({ ok: false, error: uploadErr.message });
    }
  });
});

// API: DELETE /api/upload (delete local upload)
app.delete('/api/upload', (req, res) => {
  try {
    const reference = (req.body && (req.body.url || req.body.filename)) || "";
    const filepath = resolveUploadFilepath(reference);
    if (!filepath) {
      return res.status(400).json({ ok: false, error: 'Invalid upload reference' });
    }
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ ok: false, error: 'Upload not found' });
    }
    fs.unlinkSync(filepath);
    res.json({ ok: true, deleted: path.basename(filepath) });
  } catch (err) {
    console.error('Error deleting upload:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Serve uploads directory
app.use('/uploads', express.static(UPLOADS_DIR));

// Serve static files from root directory
app.use(express.static(__dirname));

function startServer(port = PORT, host = HOST) {
  // Start server, defaulting to all interfaces for kiosk/device access.
  const server = app.listen(port, host, () => {
    const info = server.address();
    const resolvedPort = info && typeof info === 'object' ? info.port : port;
    const showNetworkAddresses = host === "0.0.0.0" || host === "::";
    const networkAddresses = showNetworkAddresses ? getNetworkAddresses() : [];

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 PHOTOBOOTH SERVER RUNNING');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('📍 Access URLs:');
    console.log(`   Local:    http://localhost:${resolvedPort}`);

    if (networkAddresses.length > 0) {
      networkAddresses.forEach(addr => {
        console.log(`   Network:  http://${addr}:${resolvedPort}`);
      });
      console.log('');
      console.log('📱 Use the Network URL to access from other devices');
      console.log('   (iPad, phone, etc. on the same WiFi network)');
    }

    console.log('');
    console.log(`📂 Directory: ${__dirname}`);
    console.log(`💾 Data:      ${LOCAL_DATA_DIR}`);
    console.log(`📤 Uploads:   ${UPLOADS_DIR}`);
    console.log('');
    console.log('✅ API Endpoints:');
    console.log('   GET      /api/health');
    console.log('   GET/PUT  /api/fonts');
    console.log('   GET/PUT  /api/themes');
    console.log('   GET/PUT  /api/events');
    console.log('   GET/POST /api/gallery');
    console.log('   GET/POST/PATCH/DELETE /api/assets');
    console.log('   POST     /api/upload');
    console.log('   DELETE   /api/upload');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  Press Ctrl+C to stop the server');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
  });
  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer, UPLOADS_DIR, LOCAL_DATA_DIR, resolveUploadFilepath, readJsonFile, writeJsonFile };
