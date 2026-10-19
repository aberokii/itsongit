#!/usr/bin/env bash
# Set up everything make.py and zernio.py need on a fresh machine (the cloud routine runs this first; safe to re-run).
# Linux (Debian/Ubuntu) or macOS. Installs: ffmpeg, uv + pipeline venv, node deps for studio/ and capture/,
# Playwright Chromium, Remotion's headless browser, the Inter + JetBrains Mono fonts and an emoji font.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT=$(pwd)
SUDO=""; command -v sudo >/dev/null 2>&1 && [ "$(id -u)" != 0 ] && SUDO="sudo"
say() { printf '\n== %s\n' "$*"; }

say "node"
node -v || { echo "node >= 22 is required"; exit 1; }
[ "$(node -p 'process.versions.node.split(".")[0]')" -ge 22 ] || { echo "node >= 22 is required"; exit 1; }

if [ "$(uname)" = Linux ]; then
  say "system packages (ffmpeg, fonts)"
  if command -v apt-get >/dev/null 2>&1; then
    $SUDO apt-get update -qq || true
    $SUDO apt-get install -y -qq ffmpeg fonts-noto-color-emoji fontconfig unzip curl >/dev/null || true
  fi
  if ! command -v ffmpeg >/dev/null 2>&1; then  # no apt / no root: static build
    mkdir -p "$HOME/.local/bin"
    curl -fsSL https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz | tar -xJ -C /tmp
    cp /tmp/ffmpeg-*-amd64-static/ffmpeg /tmp/ffmpeg-*-amd64-static/ffprobe "$HOME/.local/bin/"
  fi
  # brand fonts (the HyperFrames hook names them; Remotion loads its own copies)
  FD="$HOME/.local/share/fonts/itsongit"
  if [ ! -f "$FD/.done" ]; then
    mkdir -p "$FD"
    curl -fsSL -o /tmp/inter.zip https://github.com/rsms/inter/releases/download/v4.1/Inter-4.1.zip
    unzip -qo /tmp/inter.zip 'extras/ttf/*' -d /tmp/inter && cp /tmp/inter/extras/ttf/Inter-*.ttf "$FD/"
    curl -fsSL -o /tmp/jbm.zip https://github.com/JetBrains/JetBrainsMono/releases/download/v2.304/JetBrainsMono-2.304.zip
    unzip -qo /tmp/jbm.zip 'fonts/ttf/*' -d /tmp/jbm && cp /tmp/jbm/fonts/ttf/JetBrainsMono-*.ttf "$FD/"
    fc-cache -f >/dev/null 2>&1 || true
    touch "$FD/.done"
  fi
else
  command -v ffmpeg >/dev/null || { echo "install ffmpeg (brew install ffmpeg)"; exit 1; }
fi
export PATH="$HOME/.local/bin:$PATH"
ffmpeg -version | head -1

say "uv + pipeline venv (kokoro-onnx, faster-whisper)"
command -v uv >/dev/null 2>&1 || curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"
(cd pipeline && uv sync --frozen 2>/dev/null || uv sync)

say "node deps"
(cd studio && npm ci --no-audit --no-fund)
(cd capture && npm ci --no-audit --no-fund 2>/dev/null || npm install --no-audit --no-fund)

say "browsers"
if [ "$(uname)" = Linux ]; then
  # use capture's own playwright-core so the browser revision matches it
  (cd capture && npx playwright-core install --with-deps chromium) || (cd capture && npx playwright-core install chromium)
else
  (cd capture && npx playwright-core install chromium)
fi
(cd studio && npx remotion browser ensure)
npx -y hyperframes@0.8.176 --version >/dev/null 2>&1 || true

say "env"
echo "HYPERFRAMES_PYTHON=$ROOT/pipeline/.venv/bin/python"
[ -n "${ZERNIO_API_KEY:-}" ] || [ -f .env ] || echo "WARNING: ZERNIO_API_KEY is not set: zernio.py will only dry-run"
echo "bootstrap OK"
