#!/data/data/com.termux/files/usr/bin/bash

echo "🚀 Installing Khutba-Connected..."

# ----------------------------
# 1. SAFE TERMUX SETUP
# ----------------------------
termux-wake-lock

pkg update -y && pkg upgrade -y

pkg install -y nodejs git curl

# ----------------------------
# 2. CLEAN INSTALL
# ----------------------------
cd ~

rm -rf Khutba-Connected

echo "📦 Cloning repository..."
git clone https://github.com/YounesMaat/Khutba-Connected.git

cd Khutba-Connected/sermon-app

# ----------------------------
# 3. INSTALL DEPENDENCIES
# ----------------------------
echo "📦 Installing npm dependencies..."

npm install

# QR support (fix your issue)
npm install qrcode qrcode-terminal

# ----------------------------
# 4. CREATE SHORTCUT SYSTEM
# ----------------------------
echo "📱 Creating Termux shortcuts..."

mkdir -p ~/.shortcuts

# START SERVER
cat > ~/.shortcuts/start-khutba << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash

cd ~/Khutba-Connected/sermon-app

echo "🚀 Starting server..."

pkill node

termux-wake-lock

nohup node server.js > server.log 2>&1 & disown

sleep 4

termux-open-url http://127.0.0.1:3000
EOF

# STOP SERVER
cat > ~/.shortcuts/stop-khutba << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash

echo "🛑 Stopping server..."
pkill node
EOF

chmod +x ~/.shortcuts/start-khutba
chmod +x ~/.shortcuts/stop-khutba

# ----------------------------
# 5. AUTO START AFTER INSTALL
# ----------------------------
echo "🚀 Launching server automatically..."

pkill node

nohup node server.js > server.log 2>&1 & disown

sleep 2

termux-open-url http://127.0.0.1:3000

# ----------------------------
# 6. DONE MESSAGE
# ----------------------------
echo ""
echo "✅ INSTALL COMPLETE"
echo "📱 Open Termux Widget"
echo "▶ Start Khutba"
echo "🛑 Stop Khutba"
echo ""
echo "📡 Server running at: http://127.0.0.1:3000"
