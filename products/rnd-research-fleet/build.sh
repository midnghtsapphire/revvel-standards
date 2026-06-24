#!/bin/bash
# Build script - creates distributable zip
# Usage: ./build.sh

set -e

echo "🔨 Building R&D Research Fleet..."
echo ""

# Create zip excluding git and node_modules
zip -r "rnd-research-fleet-v1.0.0.zip" . \
  -x "*.git*" \
  -x "node_modules/*" \
  -x "*.DS_Store" \
  -x "__MACOSX/*"

echo ""
echo "✅ Build complete!"
ls -lh "rnd-research-fleet-v1.0.0.zip"
echo ""
echo "Upload this file to Gumroad:"
echo "https://app.gumroad.com/products/new"
