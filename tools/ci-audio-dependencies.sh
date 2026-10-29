#!/usr/bin/env bash
set -euo pipefail

# Store only APT archives; APT still refreshes and verifies its signed indexes.
archives="${1:?APT archive directory is required}"
if ! command -v ffprobe >/dev/null; then
  sudo apt-get update
  sudo apt-get -o "Dir::Cache::archives=${archives}/" install --yes --no-install-recommends ffmpeg
fi
ffprobe -version
