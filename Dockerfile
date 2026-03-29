# 使用 Node.js 20 作為基底
FROM node:20-alpine

# 設定工作目錄
WORKDIR /usr/src/app

# 複製 package.json 並安裝依賴
COPY package*.json ./
RUN npm install

# 複製所有原始碼
COPY . .

# 編譯 Angular 專案 (這會產生 dist 資料夾)
RUN npm run build

# 設定 Cloud Run 預設的 PORT
ENV PORT=8080
EXPOSE 8080

# 啟動 Angular SSR 伺服器
CMD ["node", "dist/app/server/server.mjs"]