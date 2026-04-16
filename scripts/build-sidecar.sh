#!/bin/bash
# Build the Python API sidecar binary with PyInstaller
# This creates the videosearch-api folder in dist/ and copies it
# to the Tauri sidecar location.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
TAURI_DIR="$PROJECT_DIR/ui/src-tauri"
TARGET_TRIPLE="aarch64-apple-darwin"

echo "==> Building PyInstaller bundle..."
cd "$PROJECT_DIR"
source venv/bin/activate
pyinstaller videosearch_api.spec --noconfirm

echo "==> Copying sidecar to Tauri binaries..."
SIDECAR_DIR="$TAURI_DIR/binaries"
mkdir -p "$SIDECAR_DIR"

# Clean old sidecar
rm -rf "$SIDECAR_DIR/videosearch-api"

# Copy the PyInstaller folder output
cp -R dist/videosearch-api "$SIDECAR_DIR/videosearch-api"

# Tauri externalBin expects a binary with the target triple suffix
# Create symlink: videosearch-api-aarch64-apple-darwin -> videosearch-api/videosearch-api
ln -sf "videosearch-api/videosearch-api" "$SIDECAR_DIR/videosearch-api-${TARGET_TRIPLE}"

echo "==> Sidecar ready at $SIDECAR_DIR"
ls -la "$SIDECAR_DIR/videosearch-api-${TARGET_TRIPLE}"
du -sh "$SIDECAR_DIR/videosearch-api"

echo ""
echo "==> Next steps:"
echo "   cd ui && npm run tauri build -- --bundles app"
echo "   # Then create DMG manually if needed:"
echo "   hdiutil create -volname VideoSearch -srcfolder <app-path> -ov -format UDZO VideoSearch.dmg"
