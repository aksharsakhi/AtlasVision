#!/bin/bash
# AtlasVision — One-command launcher
# Run this from anywhere inside the GlobalControl folder

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$SCRIPT_DIR/app"

echo "🌍 AtlasVision v4.0 — Starting up..."
echo "📁 App directory: $APP_DIR"

if [ ! -d "$APP_DIR" ]; then
  echo "❌ Error: app/ folder not found at $APP_DIR"
  exit 1
fi

cd "$APP_DIR"

echo "📦 Installing dependencies (if needed)..."
npm install --silent

echo ""
echo "🚀 Launching API Server + Vite Dev Server..."
echo "   → App:    http://localhost:5173"
echo "   → API:    http://localhost:3001/api/health"
echo ""
npm run dev
