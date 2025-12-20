# Network Setup Guide

## Quick Start: Connecting Devices to Your Photobooth

### Step 1: Connect to the Same WiFi Network

**All devices must be on the same WiFi network:**

1. **On your Mac** (the computer running the photobooth server):
   - Click the WiFi icon in the menu bar
   - Note which network you're connected to (e.g., "Home WiFi", "Event WiFi")

2. **On your iPad/iPhone/other device**:
   - Go to Settings → WiFi
   - Connect to the **exact same WiFi network** as your Mac

> **Important**: Both devices must be on the same network. If your Mac is on "Home WiFi" and your iPad is on "Guest WiFi", they won't be able to communicate.

---

### Step 2: Start the Photobooth Server

1. Double-click `Launch-Photobooth-Production.command`
2. The server will start and display network URLs like this:

```
📍 Access URLs:
   Local:    http://localhost:8000
   Network:  http://192.168.1.123:8000
```

3. **Copy the Network URL** (the one that starts with `192.168...`)

---

### Step 3: Open on Other Devices

1. On your iPad/iPhone, open Safari (or any browser)
2. Type or paste the **Network URL** from Step 2
3. The photobooth will load with all your settings!

---

## Troubleshooting

### Can't Connect from Other Devices?

**Check 1: Same WiFi Network**
- Verify both devices show the same WiFi network name in settings

**Check 2: Firewall Settings**
- On your Mac, go to System Settings → Network → Firewall
- If firewall is ON, you may need to allow Node.js to accept incoming connections
- When prompted, click "Allow"

**Check 3: Network Type**
- Public WiFi networks (coffee shops, hotels) often block device-to-device communication
- Use a private home network or create a personal hotspot

### Creating a Personal Hotspot (Alternative)

If you can't use the same WiFi:

1. **On your Mac**:
   - System Settings → General → Sharing
   - Turn on "Internet Sharing" or use your iPhone's hotspot

2. **On your iPad/iPhone**:
   - Settings → Personal Hotspot → Turn On
   - Connect your Mac to this hotspot

3. Then follow Steps 2-3 above

---

## How It Works

- Your Mac runs the photobooth server
- The server is accessible to any device on the same network
- Settings and uploads are saved on your Mac in the `local-data/` folder
- All devices see the same photobooth with the same settings
