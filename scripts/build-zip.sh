#!/usr/bin/env bash
# 重新打包 extension/ 成 download/live-wallpaper.zip（修改擴充功能後執行）
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p download
rm -f download/live-wallpaper.zip
(cd extension && zip -qr ../download/live-wallpaper.zip . -x '.DS_Store' '*/.DS_Store')
echo "built download/live-wallpaper.zip"
