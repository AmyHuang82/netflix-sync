// Background 腳本
chrome.runtime.onInstalled.addListener(function() {
  console.log('Netflix Sync 擴展已安裝');
});

// 處理來自 popup 的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'executeContentScript') {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.scripting.executeScript({
        target: {tabId: tabs[0].id},
        files: ['content.js']
      });
    });
  }
  sendResponse({success: true});
});

// 當標籤頁更新時檢查是否需要注入腳本
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('netflix.com')) {
    // 確保在 Netflix 頁面載入完成後注入腳本
    setTimeout(() => {
      chrome.scripting.executeScript({
        target: {tabId: tabId},
        files: ['content.js']
      }).catch(err => {
        console.log('腳本注入失敗:', err);
      });
    }, 1000);
  }
}); 