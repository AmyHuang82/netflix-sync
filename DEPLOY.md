# 快速部署指南

## 步驟 1: 準備專案

1. 確保你有以下檔案：
   - `package.json`
   - `next.config.js`
   - `vercel.json`
   - `pages/api/ws.js`

## 步驟 2: 部署到 Vercel

### 方法一：使用 Vercel CLI

```bash
# 安裝 Vercel CLI
npm i -g vercel

# 登入 Vercel
vercel login

# 部署專案
vercel

# 設定環境變數（如果需要）
vercel env add
```

### 方法二：使用 Vercel Dashboard

1. 將專案推送到 GitHub
2. 前往 [vercel.com](https://vercel.com)
3. 點擊 "New Project"
4. 選擇你的 GitHub 專案
5. 點擊 "Deploy"

## 步驟 3: 更新客戶端配置

部署完成後，你會得到一個 Vercel 網址，例如：`https://your-app.vercel.app`

然後更新客戶端腳本中的 `SERVER_URL`：

### 對於 Socket.IO 版本 (`netflix-sync-client.js`)：

```javascript
const CONFIG = {
  SERVER_URL: 'https://your-app.vercel.app', // 替換為你的 Vercel 網址
  // ...
};
```

### 對於原生 WebSocket 版本 (`netflix-sync-simple.js`)：

```javascript
const CONFIG = {
  SERVER_URL: 'wss://your-app.vercel.app/api/ws', // 替換為你的 Vercel 網址
  // ...
};
```

## 步驟 4: 測試部署

1. 打開你的 Vercel 應用網址
2. 應該會看到 Next.js 的預設頁面
3. 測試 WebSocket 連接：`https://your-app.vercel.app/api/ws`

## 常見問題

### 部署失敗

- 檢查 `package.json` 中的依賴是否正確
- 確認 `vercel.json` 配置正確
- 檢查 Vercel 的部署日誌

### WebSocket 連接失敗

- 確認 Vercel 支援 WebSocket（需要升級到 Pro 計劃）
- 或者使用其他支援 WebSocket 的平台（如 Railway、Render 等）

### 替代部署方案

如果 Vercel 不支援 WebSocket，可以考慮：

1. **Railway**: 支援 WebSocket，有免費額度
2. **Render**: 支援 WebSocket，有免費方案
3. **Heroku**: 支援 WebSocket，需要信用卡驗證
4. **DigitalOcean App Platform**: 支援 WebSocket

## 本地開發

```bash
# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev

# 測試 WebSocket
curl http://localhost:3000/api/ws
```

## 環境變數

如果需要設定環境變數，可以在 Vercel Dashboard 中設定：

1. 前往專案設定
2. 點擊 "Environment Variables"
3. 添加需要的環境變數

---

部署完成後，你就可以使用客戶端腳本來同步 Netflix 了！ 