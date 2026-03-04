#!/bin/bash
echo "🚀 Starting AtlasVision..."
echo "📦 Installing dependencies (if needed)..."
npm install

echo "🌍 Booting API Server & Client interface..."
npm run dev
