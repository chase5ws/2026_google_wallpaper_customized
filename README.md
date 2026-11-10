# Live Wallpaper 動態新分頁

把 Chrome 新分頁變成可自訂的動態桌面（Manifest V3）。

🌐 介紹網頁：https://chase5ws.github.io/2026_google_wallpaper_customized/

## 功能

- **桌布來源**：上傳本機影片 / GIF / 圖片（IndexedDB，離線可用）、影片或圖片網址、YouTube、6 種內建 canvas 動畫（極光、粒子網路、星空、數字雨、雨夜、海浪）
- **桌布庫**：多張切換，或每次開新分頁隨機
- **外觀**：填滿方式、暗化、模糊、影片速度、靜音、切分頁自動暫停
- **左上角控制**：齒輪開設定、箭頭進編輯模式
- **可拖拽元件**：時鐘、日期、搜尋框、常用網站、便條；拖拽移動、滾輪縮放、✕ 隱藏，靠近中線自動吸附
- **資料**：匯出 / 匯入設定 JSON，多分頁即時同步

## 安裝（開發者模式）

1. 下載 [`download/live-wallpaper.zip`](download/live-wallpaper.zip) 並解壓縮（或直接用 repo 裡的 `extension/` 資料夾）
2. 打開 `chrome://extensions`，開啟「開發人員模式」
3. 點「載入未封裝項目」，選解壓縮後的資料夾

## 專案結構

```
extension/            擴充功能本體（載入這個資料夾）
  manifest.json       MV3，覆寫 newtab
  background.js       為 YouTube 嵌入補 Referer（避免錯誤 153）
  newtab.html / css/newtab.css
  js/app.js           主程式、設定面板
  js/settings.js      預設值與 chrome.storage
  js/db.js            IndexedDB（上傳的媒體）
  js/wallpaper.js     背景渲染
  js/effects.js       內建 canvas 動畫（介紹網頁也共用）
  js/widgets.js       元件與拖拽編輯
index.html, assets/   GitHub Pages 介紹網頁
download/             打包好的 zip
scripts/build-zip.sh  修改 extension/ 後重新打包 zip
```

## GitHub Pages

Settings → Pages → Source 選 `Deploy from a branch`，Branch 選 `main` / `(root)`。

## 新增內建動畫

在 `extension/js/effects.js` 的 `EFFECTS` 加名稱與預設色，並在 `impl` 實作 `init(state, w, h, opts, ctx)` 與 `frame(state, ctx, w, h, t, dt, opts, mouse)`。介紹網頁會自動出現新選項。

## 已知限制

- 作者關閉嵌入的 YouTube 影片無法播放；YouTube 一律靜音。
- 大影片會吃記憶體，建議 1080p、幾十 MB 以內的循環影片。
