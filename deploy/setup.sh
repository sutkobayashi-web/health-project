#!/bin/bash
# =============================================
# 健康プロジェクト ConoHa VPS セットアップスクリプト
# 実行: ssh root@163.44.98.179 'bash -s' < setup.sh
# =============================================

set -e
echo "========== 健康プロジェクト セットアップ開始 =========="

# 1. Node.js確認 (既存kantoで使用中のはず)
echo "[1/7] Node.js確認..."
node -v || { echo "Node.jsがインストールされていません"; exit 1; }
npm -v

# 2. アプリディレクトリ作成
echo "[2/7] ディレクトリ作成..."
mkdir -p /opt/health/{uploads,server/db}

# 3. GitHubからクローン
echo "[3/7] GitHubからクローン..."
cd /opt
if [ -d "/opt/health/.git" ]; then
  cd /opt/health && git pull origin master
else
  git clone https://github.com/sutkobayashi-web/health-project.git /opt/health-tmp
  cp -r /opt/health-tmp/* /opt/health/
  cp -r /opt/health-tmp/.* /opt/health/ 2>/dev/null || true
  rm -rf /opt/health-tmp
fi

# 4. 依存パッケージインストール
echo "[4/7] npm install..."
cd /opt/health
npm install --production

# 5. 環境変数ファイル作成 (既存があればスキップ)
echo "[5/7] .env確認..."
if [ ! -f /opt/health/.env ]; then
  cp /opt/health/.env.example /opt/health/.env
  echo "★ /opt/health/.env を編集してAPIキーを設定してください"
fi

# 6. Nginx設定
echo "[6/7] Nginx設定..."
cp /opt/health/deploy/nginx-health.conf /etc/nginx/sites-available/health.biz-terrace.org
ln -sf /etc/nginx/sites-available/health.biz-terrace.org /etc/nginx/sites-enabled/
nginx -t
echo "★ SSL証明書取得: certbot --nginx -d health.biz-terrace.org"

# 7. systemdサービス登録
echo "[7/7] systemd登録..."
cp /opt/health/deploy/health.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable health
systemctl start health
systemctl status health --no-pager

echo ""
echo "========== セットアップ完了 =========="
echo ""
echo "【残作業】"
echo "1. DNS設定: health.biz-terrace.org → 163.44.98.179 (Aレコード)"
echo "2. .env編集: nano /opt/health/.env"
echo "3. SSL取得: certbot --nginx -d health.biz-terrace.org"
echo "4. 再起動: systemctl restart health"
echo ""
echo "確認URL: https://health.biz-terrace.org/api/health"
