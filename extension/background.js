// YouTube 嵌入播放器現在會檢查 Referer，從 chrome-extension:// 頁面嵌入時常出現
// 「錯誤 153」。這條規則只針對「本擴充功能發起」的 YouTube 嵌入請求補上 Referer。
const YT_RULE_ID = 1;

async function installYoutubeRule() {
  try {
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [YT_RULE_ID],
      addRules: [{
        id: YT_RULE_ID,
        priority: 1,
        action: {
          type: 'modifyHeaders',
          requestHeaders: [
            { header: 'Referer', operation: 'set', value: 'https://www.youtube.com/' }
          ]
        },
        condition: {
          initiatorDomains: [chrome.runtime.id],
          requestDomains: ['youtube.com', 'youtube-nocookie.com'],
          resourceTypes: ['sub_frame']
        }
      }]
    });
  } catch (e) {
    console.warn('[LiveWallpaper] 無法設定 YouTube 規則', e);
  }
}

chrome.runtime.onInstalled.addListener(installYoutubeRule);
chrome.runtime.onStartup.addListener(installYoutubeRule);
installYoutubeRule();

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: 'chrome://newtab' });
});
