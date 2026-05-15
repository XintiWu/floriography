#!/bin/bash

# 設定變數
SERVER_IP="170.9.54.46"
SERVER_USER="opc"
KEY_PATH="/Users/jakehu/keys/floriography.key"
REMOTE_DIR="/home/opc/frontend"

echo "🚀 開始部署到 OCI 伺服器 ($SERVER_IP)..."

# 1. 同步檔案到伺服器 (排除不需要的檔案)
echo "📦 同步檔案中..."
rsync -avz --exclude 'node_modules' \
      --exclude '.next' \
      --exclude '.git' \
      --exclude '.env.local' \
      -e "ssh -i $KEY_PATH" \
      ./ $SERVER_USER@$SERVER_IP:$REMOTE_DIR

# 2. 在遠端伺服器執行構建與重啟
echo "🛠️ 在伺服器上執行構建..."
ssh -i $KEY_PATH $SERVER_USER@$SERVER_IP << EOF
    cd $REMOTE_DIR
    # 安裝依賴
    npm install
    # 執行構建
    npm run build
    # 重啟 PM2 服務 (假設服務名稱為 floriography)
    pm2 restart floriography || pm2 start npm --name "floriography" -- start
    echo "✅ 伺服器端更新完成！"
EOF

echo "✨ 部署成功！您的網站已在 $SERVER_IP 更新。"
