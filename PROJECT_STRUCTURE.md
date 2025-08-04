# Netflix Sync 項目結構

## 📁 目錄結構

```
netflix-sync/
├── 📂 chrome-extension/          # Chrome 擴展（前端）
│   ├── 📄 manifest.json         # 擴展配置文件
│   ├── 📄 popup.html           # 彈出視窗 HTML
│   ├── 📄 popup.js             # 彈出視窗 JavaScript
│   ├── 📄 background.js         # 背景腳本
│   ├── 📄 content.js           # 內容腳本（核心邏輯）
│   ├── 📂 icons/               # 圖標文件夾
│   │   ├── 📄 icon.svg         # SVG 圖標源文件
│   │   ├── 📄 icon16.png       # 16x16 圖標
│   │   ├── 📄 icon48.png       # 48x48 圖標
│   │   └── 📄 icon128.png      # 128x128 圖標
│   ├── 📄 create-icons.html    # 圖標生成工具
│   ├── 📄 README.md            # 擴展說明文檔
│   ├── 📄 README-EXTENSION.md  # 詳細使用說明
│   └── 📄 INSTALL.md           # 安裝指南
├── 📂 pages/                   # Vercel 後端 API
│   ├── 📄 api/socket.js        # WebSocket 伺服器
│   └── 📄 index.js             # 主頁面
├── 📄 netflix-sync-client.js   # 控制台腳本版本
├── 📄 package.json             # Node.js 依賴
├── 📄 vercel.json              # Vercel 配置
├── 📄 next.config.js           # Next.js 配置
├── 📄 README.md                # 主項目說明
├── 📄 DEPLOY.md                # 部署指南
└── 📄 PROJECT_STRUCTURE.md     # 本文件
```

## 🎯 組件說明

### Chrome 擴展 (`chrome-extension/`)

**用途**: 提供易用的瀏覽器擴展介面

**主要文件**:
- `manifest.json`: Chrome 擴展的配置文件
- `popup.html/js`: 擴展彈出視窗的用戶介面
- `background.js`: 背景腳本，管理擴展生命週期
- `content.js`: 內容腳本，注入到 Netflix 頁面處理同步邏輯
- `icons/`: 擴展圖標文件

**特點**:
- 用戶友好的圖形介面
- 一鍵加入/離開房間
- 實時狀態顯示
- 自動注入到 Netflix 頁面

### Vercel 後端 (`pages/`)

**用途**: 提供 WebSocket 伺服器和 API

**主要文件**:
- `api/socket.js`: WebSocket 伺服器，處理即時通訊
- `index.js`: 主頁面，提供基本資訊

**特點**:
- 使用 Socket.IO 處理 WebSocket 連接
- 支援多個同步房間
- 自動部署到 Vercel
- 處理播放狀態和時間同步事件

### 控制台腳本

**用途**: 提供快速測試和開發的腳本

**主要文件**:
- `netflix-sync-client.js`: 完整的 Socket.IO 版本

**特點**:
- 可直接在瀏覽器控制台使用
- 適合開發和測試
- 提供完整的 API 介面

## 🔄 工作流程

### Chrome 擴展流程

1. **安裝**: 用戶在 Chrome 中載入擴展
2. **配置**: 修改 `content.js` 中的伺服器地址
3. **使用**: 在 Netflix 頁面點擊擴展圖標
4. **同步**: 輸入房間名稱，開始同步觀看

### 控制台腳本流程

1. **部署**: 將後端部署到 Vercel
2. **配置**: 修改腳本中的伺服器地址
3. **使用**: 在 Netflix 頁面控制台執行腳本
4. **同步**: 使用 API 加入房間並同步

## 🛠️ 開發指南

### 修改 Chrome 擴展

1. 進入 `chrome-extension/` 資料夾
2. 修改相關文件
3. 在 `chrome://extensions/` 中重新載入擴展
4. 重新載入 Netflix 頁面

### 修改後端

1. 修改 `pages/` 中的文件
2. 推送到 GitHub
3. Vercel 會自動部署

### 修改控制台腳本

1. 修改根目錄中的腳本文件
2. 在 Netflix 頁面控制台測試

## 📚 文檔

- [主項目 README](README.md) - 完整的項目說明
- [Chrome 擴展文檔](chrome-extension/README.md) - 擴展詳細說明
- [安裝指南](chrome-extension/INSTALL.md) - 擴展安裝步驟
- [部署指南](DEPLOY.md) - Vercel 部署說明

## 🎯 使用建議

### 一般用戶
推薦使用 **Chrome 擴展**，因為：
- 介面友好，操作簡單
- 一鍵安裝，無需複製貼上代碼
- 自動注入，無需手動執行

### 開發者
可以使用 **控制台腳本**，因為：
- 方便調試和測試
- 可以快速修改和實驗
- 適合開發新功能

### 部署者
需要同時部署：
- **後端**: 推送到 GitHub，自動部署到 Vercel
- **前端**: 用戶安裝 Chrome 擴展或使用控制台腳本 