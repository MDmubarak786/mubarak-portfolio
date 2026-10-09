#!/bin/sh
# Rasterize page 1 of the resume PDF into src/assets/resume-p1.png (macOS sips, no extra deps).
# Run after replacing public/resume/Mubarak-Shajahan-Resume.pdf:  npm run resume:thumb
set -e
cd "$(dirname "$0")/.."
sips -s format png --resampleWidth 1240 public/resume/Mubarak-Shajahan-Resume.pdf --out src/assets/resume-p1.png >/dev/null
sips -g pixelWidth -g pixelHeight src/assets/resume-p1.png
