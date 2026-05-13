#!/data/data/com.termux/files/usr/bin/bash

echo "🚀 Installing Khutba-Connected (Phone Android only)..."

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

echo "📦 Cloning repository (sparse checkout - Phone_Android only)..."

git clone --no-checkout https://github.com/YounesMaat/Khutba-Connected.git
cd Khutba-Connected

git sparse-checkout init --cone

# ONLY KEEP Phone_Android (Windows will NOT be downloaded)
git sparse-checkout set Phone_Android

git checkout main 2>/dev/null || git checkout master

# ----------------------------
# 3. ENTER ANDROID APP FOLDER
# ----------------------------
cd Phone_Android || {
  echo "❌ Phone_Android folder not found!"
  exit 1
}

# ----------------------------
# 4. INSTALL DEPENDENCIES
# ----------------------------
echo "📦 Installing npm dependencies..."

npm install
npm install qrcode qrcode-terminal

# ----------------------------
# 5. FORCE REFRESH WIDGETS
# ----------------------------
echo "📱 Updating Termux widgets..."

rm -rf ~/.shortcuts
mkdir -p ~/.shortcuts

# ----------------------------
# START WIDGET
# ----------------------------
cat > ~/.shortcuts/start-khutba << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash

echo "🚀 Starting Khutba server..."

cd "$HOME/Khutba-Connected/Phone_Android" || exit 1

pkill -f "node server.js"

termux-wake-lock

setsid node server.js > server.log 2>&1 < /dev/null &

sleep 3

termux-open-url http://127.0.0.1:3000/admin.html
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
# 6. DONE
# ----------------------------
echo ""
echo "✅ INSTALL COMPLETE (Phone Android only)"
echo ""
echo "📱 Windows folder was NOT downloaded"
echo ""
echo "▶ Start Khutba"
echo "⏹ Stop Khutba"
echo ""
echo "📡 Server: http://127.0.0.1:3000"
