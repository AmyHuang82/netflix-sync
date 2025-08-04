# Netflix Sync - 多人同步觀看 Netflix

這是一個使用 Vercel 作為後端伺服器，透過 WebSocket 來同步 Netflix 播放狀態的系統。支援瀏覽器控制台腳本和 Chrome 擴展兩種使用方式。

## 功能特色

- 🎬 **播放同步**: 自動同步播放/暫停狀態
- ⏰ **時間同步**: 同步影片播放時間點
- 🔄 **自動重連**: 網路斷線時自動重新連接
- 🛡️ **防抖處理**: 避免過於頻繁的同步請求
- 🎯 **Chrome 擴展**: 提供易用的瀏覽器擴展
- 📱 **多種使用方式**: 支援控制台腳本和擴展
- 👥 **房間管理**: 查看和管理同步房間
- 🗑️ **房間刪除**: 管理員可以刪除房間

## 📁 項目結構

```
netflix-sync/
├── chrome-extension/      # Chrome 擴展
│   ├── manifest.json     # 擴展配置
│   ├── popup.html        # 彈出視窗
│   ├── content.js        # 核心邏輯
│   ├── background.js     # 背景腳本
│   └── icons/           # 圖標文件
├── pages/                # Vercel 後端 API
│   ├── api/
│   │   ├── ws.js        # WebSocket 服務器
│   │   └── rooms.js     # 房間管理 API
│   └── index.js         # 管理頁面
├── netflix-sync-client.js    # 控制台腳本版本
├── netflix-sync-simple.js    # 簡化版本
└── README.md            # 本文件
```

## 🚀 快速開始

### 方法一：Chrome 擴展（推薦）

1. **部署後端**：
   - 將此專案推送到 GitHub
   - 在 Vercel 中導入專案並部署

2. **安裝擴展**：
   - 進入 `chrome-extension/` 資料夾
   - 修改 `content.js` 中的伺服器地址
   - 在 Chrome 中載入擴展

3. **使用擴展**：
   - 打開 Netflix 並播放影片
   - 點擊擴展圖標
   - 輸入房間名稱並加入

詳細說明請查看：[Chrome 擴展文檔](chrome-extension/README.md)

### 方法二：瀏覽器控制台腳本

1. **部署到 Vercel**：
   - 將此專案推送到 GitHub
   - 在 Vercel 中導入專案
   - 部署完成後，記下你的 Vercel 應用網址

2. **更新客戶端配置**：
   在 `netflix-sync-client.js` 中，將 `SERVER_URL` 替換為你的 Vercel 應用網址：

   ```javascript
   const CONFIG = {
     SERVER_URL: 'https://your-app-name.vercel.app', // 替換為你的 Vercel 網址
     // ...
   };
   ```

3. **使用方法**：
   - 打開 Netflix 並開始播放影片
   - 按 `F12` 打開開發者工具
   - 複製 `netflix-sync-client.js` 的內容
   - 貼到 Console 並執行

## 📖 使用說明

### 房間管理

部署完成後，訪問你的 Vercel 應用網址，可以看到房間管理頁面：

- **查看房間**: 顯示所有活躍的同步房間
- **成員數量**: 顯示每個房間的當前成員數
- **刪除房間**: 管理員可以刪除不需要的房間
- **即時消息**: 顯示房間活動的即時消息

### Chrome 擴展

- **安裝**: 在 Chrome 中載入 `chrome-extension/` 資料夾
- **配置**: 修改 `content.js` 中的伺服器地址
- **使用**: 點擊擴展圖標，輸入房間名稱加入同步

### 控制台腳本

```javascript
// 加入同步房間
NetflixSync.joinRoom('my-room');

// 查看當前狀態
NetflixSync.getStatus();

// 手動同步當前狀態
NetflixSync.sync();

// 離開房間
NetflixSync.leaveRoom();

// 斷開連接
NetflixSync.disconnect();
```

## 🔧 開發

### 房間管理 API

- `GET /api/rooms` - 獲取房間列表
- `DELETE /api/rooms` - 刪除指定房間

### Chrome 擴展開發

- 修改 `chrome-extension/` 中的文件
- 在 `chrome://extensions/` 中重新載入擴展
- 重新載入 Netflix 頁面

### 後端開發

- 修改 `pages/` 中的 API 文件
- 推送到 GitHub 自動部署到 Vercel

### 控制台腳本開發

- 修改 `netflix-sync-client.js`
- 在 Netflix 頁面的控制台中測試

## 🐛 故障排除

### 常見問題

1. **無法連接到伺服器**
   - 檢查伺服器地址是否正確
   - 確認 Vercel 應用已正確部署
   - 檢查網路連接

2. **同步不生效**
   - 確認已加入房間
   - 檢查是否在 Netflix 頁面
   - 確認影片正在播放

3. **擴展無法載入**
   - 檢查 `manifest.json` 文件是否完整
   - 確認所有引用的文件都存在
   - 查看 Chrome 擴展頁面的錯誤信息

4. **房間管理頁面無法訪問**
   - 確認 Vercel 部署成功
   - 檢查 API 端點是否正常
   - 查看瀏覽器控制台錯誤

### 除錯技巧

```javascript
// 查看詳細狀態
console.log(NetflixSync.getStatus());

// 檢查網路連接
console.log('WebSocket 狀態：', ws ? ws.readyState : '未連接');

// 檢查影片元素
console.log('影片元素：', document.querySelector('video'));

// 檢查房間 API
fetch('/api/rooms').then(r => r.json()).then(console.log);
```

## 📚 文檔

- [Chrome 擴展文檔](chrome-extension/README.md) - 擴展的詳細說明
- [安裝指南](chrome-extension/INSTALL.md) - 完整的安裝步驟
- [部署指南](DEPLOY.md) - Vercel 部署說明

## 🔒 安全性注意事項

- 此項目僅用於個人學習和娛樂目的
- 請遵守 Netflix 的使用條款
- 不要用於商業用途
- 建議在私人環境中使用

## 📄 授權

MIT License - 詳見 LICENSE 檔案

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

---

**注意**: 此專案僅供學習和個人使用，請遵守相關服務條款。 