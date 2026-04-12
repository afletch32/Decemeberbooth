#!/bin/bash
# Photobooth Production - Local Server Launcher
# Starts a Node.js server accessible from other devices on the network

PHOTOBOOTH_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=8000
URL="http://localhost:$PORT"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 PHOTOBOOTH PRODUCTION LAUNCHER"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd "$PHOTOBOOTH_DIR" || {
    echo "❌ Error: Could not find photobooth directory"
    echo "Press any key to exit..."
    read -n 1
    exit 1
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    echo ""
    echo "Please install Node.js from: https://nodejs.org/"
    echo ""
    echo "Press any key to exit..."
    read -n 1
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies (first-time setup)..."
    npm install
    echo ""
fi

# Check if port is already in use
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "✅ Server already running at $URL"
    echo "📱 Opening in browser..."
    open "$URL"
    echo ""
    echo "Press any key to exit..."
    read -n 1
    exit 0
fi

echo "🚀 Starting photobooth server..."
echo "📂 Serving from: photobooth-production"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  KEEP THIS WINDOW OPEN while using the photobooth!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📱 Opening photobooth in your browser..."
echo ""
echo "💡 The server will display network URLs for other devices"
echo ""
echo "To stop the server: Press Ctrl+C"
echo ""

# Open browser after a delay to ensure server is ready
(sleep 2 && open "$URL") &

# Start Node.js server
npm start
