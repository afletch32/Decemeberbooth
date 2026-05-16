# Photobooth setup notes

## Requirements
- Node.js 18+
- npm

This project requires Node 18 or newer. Tests rely on built-in `fetch`, `FormData`, and `Blob` globals that are only available in Node 18+ runtimes.

## Install

```bash
npm install
```

## Start local server

```bash
npm start
```

Default local URL:

```text
http://localhost:8000
```

The server also exposes local network URLs for kiosk/iPad/phone testing on the same WiFi network.

## Run tests

```bash
npm test
```

## Deploy helpers

Update manifests:

```bash
npm run update-manifests
```

Deploy:

```bash
npm run deploy
```

Update manifests + deploy:

```bash
npm run ship
```

## Local storage

Runtime-generated data is stored in:

```text
local-data/
uploads/
```

These are ignored by git.

## Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `PORT` | Local server port | `8000` |
| `HOST` | Bind address | `0.0.0.0` |
| `DATA_ROOT` | Base directory for uploads/local data | project root |
| `MAX_UPLOAD_BYTES` | Upload size limit | `15728640` (15MB) |

## API endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | Server health check |
| `GET/PUT /api/fonts` | Font configuration |
| `GET/PUT /api/themes` | Theme configuration |
| `GET/PUT /api/events` | Event configuration |
| `POST /api/upload` | Upload image assets |
| `DELETE /api/upload` | Delete uploaded assets |

## Build status

See `BUILD_STATUS.md` for current priorities and next-step builder improvements.
