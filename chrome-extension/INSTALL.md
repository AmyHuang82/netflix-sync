# Netflix Sync Chrome 擴展安裝指南

## 快速開始

### 1. 準備文件

確保你有以下文件：
```
chrome-extension/
├── manifest.json
├── popup.html
├── popup.js
├── background.js
├── content.js
├── README.md
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### 2. 生成圖標

1. 打開 `create-icons.html` 文件
2. 瀏覽器會自動下載三個 PNG 圖標文件
3. 將下載的文件移動到 `icons/` 文件夾：
   - `icon16.png`
   - `icon48.png`
   - `icon128.png`

### 3. 配置伺服器地址

編輯 `content.js` 文件，找到以下行：
```javascript
const CONFIG = {
  SERVER_URL: 'https://web-production-14c5.up.railway.app',
  // ...
};
```

如果需要使用自定義伺服器，請將 `https://web-production-14c5.up.railway.app` 替換為你的實際伺服器地址。

同時更新 `manifest.json` 中的 `host_permissions`：
```json
"host_permissions": [
  "https://*.netflix.com/*",
  "https://your-server-url.com/*"
]
```

### 4. 安裝擴展

1. 打開 Chrome 瀏覽器
2. 在地址欄輸入：`chrome://extensions/`
3. 開啟右上角的「開發者模式」開關
4. 點擊「載入未封裝項目」按鈕
5. 選擇包含所有擴展文件的文件夾
6. 擴展應該會出現在列表中

### 5. 測試擴展

1. 前往 [Netflix](https://netflix.com)
2. 開始播放任何影片
3. 點擊 Chrome 工具欄中的 Netflix Sync 圖標
4. 建立房間或輸入房間 ID 並點擊「加入房間」

## 使用說明

### 建立房間
1. 在擴展彈出視窗中輸入房間 ID 和房間名稱
2. 點擊「建立房間」按鈕
3. 將房間 ID 分享給朋友

### 加入房間
1. 在擴展彈出視窗中輸入房間 ID
2. 點擊「加入房間」按鈕
3. 等待連接成功

### 查看房間列表
1. 點擊「查看房間列表」按鈕
2. 在瀏覽器控制台查看所有可用房間

## 故障排除

### 常見問題

**Q: 擴展無法載入**
A: 檢查 manifest.json 文件是否完整，確保所有引用的文件都存在。

**Q: 圖標不顯示**
A: 確保 icons 文件夾中有正確的 PNG 文件，或者暫時移除 manifest.json 中的 icons 部分。

**Q: 無法連接到伺服器**
A: 檢查 content.js 中的 SERVER_URL 是否正確，確保伺服器正在運行。

**Q: 在 Netflix 頁面沒有反應**
A: 確保正在播放 Netflix 影片，擴展只在播放頁面工作。

**Q: 房間同步不工作**
A: 確保成功加入房間，檢查瀏覽器控制台的連接日誌。

### 調試技巧

1. **查看擴展錯誤**：
   - 在 `chrome://extensions/` 中點擊擴展的「錯誤」按鈕

2. **查看內容腳本日誌**：
   - 在 Netflix 頁面按 F12 打開開發者工具
   - 查看 Console 中的 NetflixSync 日誌

3. **檢查網絡連接**：
   - 在開發者工具的 Network 標籤中查看 WebSocket 連接

4. **手動測試功能**：
   - 在瀏覽器控制台使用 `NetflixSync.getStatus()` 檢查狀態
   - 使用 `NetflixSync.getNetflixAPI()` 檢查 Netflix API 連接

## 開發模式

### 修改代碼

1. 修改任何文件後，在 `chrome://extensions/` 中點擊擴展的重新載入按鈕
2. 重新載入 Netflix 頁面

### 添加新功能

- **UI 修改**：編輯 `popup.html` 和 `popup.js`
- **邏輯修改**：編輯 `content.js`
- **權限修改**：編輯 `manifest.json`

### 本地開發

1. 修改 `content.js` 中的 `CONFIG.SERVER_URL` 為本地伺服器地址
2. 在 Chrome 擴展頁面點擊「重新載入」
3. 測試功能並查看控制台輸出

## 部署到 Chrome Web Store

1. 打包擴展：
   - 在 `chrome://extensions/` 中點擊「打包擴展」
   - 選擇擴展文件夾
   - 下載生成的 .crx 文件

2. 上傳到 Chrome Web Store：
   - 註冊開發者帳戶
   - 創建新項目
   - 上傳擴展文件

## 安全注意事項

- 此擴展僅供學習和個人使用
- 請遵守 Netflix 的使用條款
- 不要將擴展用於商業用途
- 注意保護用戶隱私

## 技術支持

如果遇到問題：
1. 檢查瀏覽器控制台的錯誤信息
2. 確認所有文件都正確創建
3. 驗證伺服器地址是否正確
4. 確保 Netflix 頁面正在播放影片
5. 查看擴展的連接狀態和房間信息 