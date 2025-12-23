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
const DATA_ROOT = process.env.DATA_ROOT || __dirname;

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
const upload = multer({ storage });

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
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
}

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

// API: POST /api/upload (file upload)
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
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
  } catch (err) {
    console.error('Error uploading file:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Serve uploads directory
app.use('/uploads', express.static(UPLOADS_DIR));

// Serve static files from root directory
app.use(express.static(__dirname));

function startServer(port = PORT) {
  // Start server - listen on all network interfaces (0.0.0.0)
  const server = app.listen(port, '0.0.0.0', () => {
    const info = server.address();
    const resolvedPort = info && typeof info === 'object' ? info.port : port;
    const networkAddresses = getNetworkAddresses();

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
    console.log('   GET/PUT  /api/fonts');
    console.log('   GET/PUT  /api/themes');
    console.log('   POST     /api/upload');
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

module.exports = { app, startServer, UPLOADS_DIR, LOCAL_DATA_DIR };
