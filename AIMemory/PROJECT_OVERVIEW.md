# Project Overview — 2026_google_wallpaper-customized

> 1-screen primer for any LLM joining this project. Detailed docs live in the
> files listed under "Where to look"; this file only points at them.

## What is this project?
Live Wallpaper 動態新分頁: a Chrome MV3 extension that turns the new tab into a customizable animated desktop, plus an intro page on GitHub Pages.

## Tech stack
- Chrome extension, Manifest V3, vanilla JS (extension/)
- IndexedDB for uploaded media, chrome.storage for settings
- GitHub Pages intro site (index.html, assets/) — this repo is served publicly
- scripts/build-zip.sh repackages download/live-wallpaper.zip

## Key decisions locked in
- (add as they are made: YYYY-MM-DD (model-id) — decision — why)

## Active concerns
- (none recorded yet)

## Where to look
- README.md — features and project structure
- After changing extension/, rebuild the zip with scripts/build-zip.sh
- Recent activity → AIMemory/work.log; older history → awm_search

---
Last rebuild: 2026-11-10 09:14 by claude-opus-5-5
