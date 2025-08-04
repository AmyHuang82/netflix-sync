# Netflix Sync Chrome 擴展

這是 Netflix Sync 項目的 Chrome 擴展部分，用於在瀏覽器中同步 Netflix 播放狀態。

## 📁 文件結構

```
chrome-extension/
├── manifest.json          # Chrome 擴展配置文件
├── popup.html            # 彈出視窗 HTML
├── popup.js              # 彈出視窗 JavaScript
├── background.js          # 背景腳本
├── content.js            # 內容腳本（核心邏輯）
├── icons/                # 圖標文件夾
│   ├── icon.svg          # SVG 圖標源文件
│   ├── icon16.png        # 16x16 圖標
│   ├── icon48.png        # 48x48 圖標
│   └── icon128.png       # 128x128 圖標
├── create-icons.html      # 圖標生成工具
├── README-EXTENSION.md    # 詳細使用說明
├── INSTALL.md            # 安裝指南
└── README.md             # 本文件
```

## 🚀 快速開始

### 1. 生成圖標

1. 打開 `create-icons.html` 文件
2. 瀏覽器會自動下載 PNG 圖標文件
3. 將下載的文件移動到 `icons/` 文件夾

### 2. 配置伺服器地址

編輯 `content.js` 文件，將 `CONFIG.SERVER_URL` 修改為你的 Vercel 應用地址：

```javascript
const CONFIG = {
  SERVER_URL: 'https://your-vercel-app.vercel.app', // 替換為你的地址
  // ...
};
```

### 3. 安裝擴展

1. 打開 Chrome 瀏覽器
2. 前往 `chrome://extensions/`
3. 開啟「開發者模式」
4. 點擊「載入未封裝項目」
5. 選擇 `chrome-extension` 資料夾

## 📖 詳細文檔

- [安裝指南](INSTALL.md) - 完整的安裝和配置步驟
- [使用說明](README-EXTENSION.md) - 詳細的功能介紹和使用方法

## 🔧 開發

### 修改代碼

1. 修改任何文件後，在 `chrome://extensions/` 中重新載入擴展
2. 重新載入 Netflix 頁面

### 文件說明

- **manifest.json**: Chrome 擴展的配置文件，定義權限和腳本
- **popup.html/js**: 擴展彈出視窗的用戶介面
- **background.js**: 背景腳本，管理擴展生命週期
- **content.js**: 內容腳本，注入到 Netflix 頁面處理同步邏輯

## 🔗 相關項目

- **後端服務**: 位於項目根目錄的 Vercel 應用
- **同步邏輯**: 使用 WebSocket 實現實時同步
- **Netflix API**: 使用 Netflix 內部 API 控制播放器

## 📝 注意事項

- 此擴展僅供學習和個人使用
- 請遵守 Netflix 的使用條款
- 需要配合後端服務器使用
- 確保在 Netflix 播放頁面使用

## 🐛 故障排除

如果遇到問題，請查看：
1. [安裝指南](INSTALL.md) 中的故障排除部分
2. Chrome 開發者工具的控制台錯誤
3. 確保後端服務器正在運行 