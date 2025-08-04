# Netflix Sync Chrome 擴展

這是一個 Chrome 擴展，可以讓多人同步觀看 Netflix 影片。

## 功能特色

- 🎬 同步播放/暫停狀態
- ⏰ 同步播放時間跳轉
- 👥 多人同時觀看
- 🎯 簡單易用的介面
- 🔄 自動重連機制

## 安裝步驟

### 1. 下載擴展文件

確保你有以下文件：
- `manifest.json`
- `popup.html`
- `popup.js`
- `background.js`
- `content.js`
- `icons/` 文件夾（包含圖標）

### 2. 修改伺服器地址

在 `content.js` 文件中，將 `CONFIG.SERVER_URL` 修改為你的 Vercel 應用地址：

```javascript
const CONFIG = {
  SERVER_URL: 'https://your-vercel-app.vercel.app', // 替換為你的地址
  // ...
};
```

### 3. 在 Chrome 中安裝

1. 打開 Chrome 瀏覽器
2. 在地址欄輸入 `chrome://extensions/`
3. 開啟右上角的「開發者模式」
4. 點擊「載入未封裝項目」
5. 選擇包含擴展文件的文件夾
6. 擴展應該會出現在擴展列表中

## 使用方法

### 1. 打開 Netflix

- 前往 [Netflix](https://netflix.com)
- 開始播放任何影片

### 2. 使用擴展

1. 點擊 Chrome 工具欄中的 Netflix Sync 圖標
2. 在彈出視窗中輸入房間名稱
3. 點擊「加入房間」
4. 與朋友分享房間名稱

### 3. 同步觀看

- 當有人播放/暫停時，其他人的播放器會同步
- 當有人跳轉時間時，其他人也會跳轉到相同時間
- 可以在彈出視窗中看到連接狀態和當前房間

## 文件結構

```
netflix-sync-extension/
├── manifest.json          # 擴展配置文件
├── popup.html            # 彈出視窗 HTML
├── popup.js              # 彈出視窗 JavaScript
├── background.js          # 背景腳本
├── content.js            # 內容腳本（核心邏輯）
└── icons/                # 圖標文件夾
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## 技術細節

### 架構

- **Popup**: 用戶介面，處理用戶輸入
- **Background**: 管理擴展生命週期
- **Content Script**: 注入到 Netflix 頁面，處理同步邏輯

### 通信機制

- Popup ↔ Content Script: 通過 `chrome.runtime.sendMessage`
- Content Script ↔ Netflix: 直接操作 Netflix API
- Content Script ↔ Server: WebSocket 連接

### Netflix API 使用

擴展使用 Netflix 的內部 API 來控制播放器：
- 獲取播放器實例
- 控制播放/暫停
- 監聽播放事件
- 跳轉播放時間

## 故障排除

### 常見問題

1. **無法找到播放器**
   - 確保正在播放 Netflix 影片
   - 重新載入頁面後再試

2. **無法連接伺服器**
   - 檢查 `CONFIG.SERVER_URL` 是否正確
   - 確保伺服器正在運行

3. **同步不工作**
   - 檢查瀏覽器控制台是否有錯誤
   - 確保所有用戶都在同一個房間

### 調試

1. 打開 Chrome 開發者工具
2. 在 Console 中查看 NetflixSync 的日誌
3. 檢查 Network 標籤中的 WebSocket 連接

## 開發

### 修改代碼

1. 修改文件後，在 `chrome://extensions/` 中點擊擴展的重新載入按鈕
2. 重新載入 Netflix 頁面

### 添加功能

- 在 `content.js` 中添加新的 API 方法
- 在 `popup.js` 中添加新的 UI 元素
- 在 `messageHandler` 中添加新的消息處理

## 授權

此擴展僅供學習和個人使用。請遵守 Netflix 的使用條款。 