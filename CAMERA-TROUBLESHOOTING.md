# Camera Black Screen - Troubleshooting Guide

## The Issue

When you click **"Start Booth"**, you see a black screen. This happens because the browser needs permission to access your camera.

---

## Quick Fix (Try This First!)

### Step 1: Check for Permission Popup

1. **Refresh the page** at http://localhost:8000
2. Click **"Start Booth"** again
3. **Look at the top of your browser window** for a permission popup that says:
   - "localhost wants to use your camera"
   - Or shows a camera icon 🎥

4. **Click "Allow"** to grant camera access

### Step 2: Check the Address Bar

If you don't see a popup, look in the **address bar** (where the URL is):

- **Chrome/Edge**: Look for a camera icon 🎥 with a red X or slash
  - Click the icon
  - Select "Always allow localhost to access your camera"
  - Refresh the page

- **Safari**: Look for a camera icon in the address bar
  - Click it
  - Select "Allow"
  - Refresh the page

---

## If That Doesn't Work

### Option A: Check Browser Settings

**For Chrome:**
1. Click the **three dots** (⋮) in the top-right
2. Go to **Settings** → **Privacy and security** → **Site Settings**
3. Click **Camera**
4. Under "Allowed to use your camera", add `http://localhost:8000`
5. Refresh the photobooth page

**For Safari:**
1. Go to **Safari** → **Settings** → **Websites** → **Camera**
2. Find `localhost` in the list
3. Change the dropdown to **"Allow"**
4. Refresh the photobooth page

### Option B: Check System Permissions (macOS)

Your Mac might be blocking camera access:

1. Go to **System Settings** → **Privacy & Security** → **Camera**
2. Make sure your browser (Chrome, Safari, etc.) is **checked** in the list
3. If it's not in the list, you may need to restart your browser
4. Refresh the photobooth page

---

## Still Having Issues?

### Check if Another App is Using the Camera

- **Close other apps** that might be using your camera:
  - Zoom, FaceTime, Photo Booth, Skype, etc.
- Then refresh the photobooth page and try again

### Try a Different Browser

- If you're using Safari, try **Chrome**
- If you're using Chrome, try **Safari**
- Camera permissions work differently in each browser

---

## How to Verify It's Working

When camera access is granted successfully:

1. You'll see a **live camera feed** (not black)
2. You'll see yourself in the preview
3. The photobooth will show a toast message: **"Camera permission granted"**

---

## Technical Details

The photobooth uses the browser's `getUserMedia` API to access your camera. This requires:
- **Browser permission** (the popup you need to allow)
- **System permission** (macOS Camera settings)
- **No other app using the camera**

The black screen means one of these requirements isn't met yet.
