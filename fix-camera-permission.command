#!/bin/bash
# Quick Camera Permission Fix
# This opens the photobooth in a way that should trigger the camera permission dialog

echo "🎥 Opening photobooth with camera permission prompt..."
echo ""
echo "IMPORTANT: When the browser opens, you MUST:"
echo "1. Look for a popup asking for camera permission"
echo "2. Click 'Allow' to grant camera access"
echo "3. Then click 'Start Booth'"
echo ""
echo "If you don't see a popup:"
echo "- Look in the address bar for a camera icon 🎥"
echo "- Click it and select 'Allow'"
echo ""
read -p "Press Enter to open the browser..."

# Open in default browser
open "http://localhost:8000"

echo ""
echo "✅ Browser opened!"
echo ""
echo "Remember to ALLOW camera access when prompted!"
