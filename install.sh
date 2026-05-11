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
npm install qrcode qrcode-terminal

# ----------------------------
# 4. FORCE REFRESH WIDGETS (IMPORTANT FIX)
# ----------------------------
echo "📱 Updating Termux widgets..."

rm -rf ~/.shortcuts
mkdir -p ~/.shortcuts

# ----------------------------
# START WIDGET (UPDATED STABLE VERSION)
# ----------------------------
cat > ~/.shortcuts/start-khutba << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash

echo "🚀 Starting Khutba server..."

cd "$HOME/Khutba-Connected/sermon-app" || exit 1

pkill -f "node server.js"

termux-wake-lock

# stable detached process (FIXED)
setsid node server.js > server.log 2>&1 < /dev/null &

sleep 3

termux-open-url http://127.0.0.1:3000
EOF

# ----------------------------
# STOP WIDGET
# ----------------------------
cat > ~/.shortcuts/stop-khutba << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash

echo "🛑 Stopping Khutba server..."

pkill -f "node server.js"

termux-wake-unlock
EOF

chmod +x ~/.shortcuts/start-khutba
chmod +x ~/.shortcuts/stop-khutba

# ----------------------------
# 5. DONE MESSAGE
# ----------------------------
echo ""
echo "✅ INSTALL COMPLETE"
echo ""
echo "📱 IMPORTANT:"
echo "If widgets already exist, REMOVE them from home screen"
echo "Then re-add Termux Widget"
echo ""
echo "▶ Start Khutba"
echo "⏹ Stop Khutba"
echo ""
echo "📡 Server: http://127.0.0.1:3000"
