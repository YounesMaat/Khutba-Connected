#!/data/data/com.termux/files/usr/bin/bash

echo "🚀 Installing Khutba-Connected..."

pkg update -y && pkg upgrade -y
pkg install -y nodejs git curl

cd ~

rm -rf Khutba-Connected

git clone https://github.com/YounesMaat/Khutba-Connected.git

cd Khutba-Connected/sermon-app

echo "📦 Installing dependencies..."

npm install

# ✅ FIX 1: install QR code support
npm install qrcode qrcode-terminal

echo "📱 Creating shortcuts..."

mkdir -p ~/.shortcuts

# START SERVER (FIXED VERSION)
cat > ~/.shortcuts/start-khutba << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash

cd ~/Khutba-Connected/sermon-app

pkill node

termux-wake-lock

nohup node server.js > server.log 2>&1 &

sleep 2

termux-open-url http://localhost:3000
EOF

# STOP SERVER
cat > ~/.shortcuts/stop-khutba << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
pkill node
EOF

chmod +x ~/.shortcuts/start-khutba
chmod +x ~/.shortcuts/stop-khutba

echo ""
echo "✅ INSTALL COMPLETE"
echo "📱 Add Termux Widget"
echo "▶ Start Khutba"
echo "🛑 Stop Khutba"
