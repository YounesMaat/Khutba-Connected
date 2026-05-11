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
# 4. CREATE WIDGET SYSTEM
# ----------------------------
echo "📱 Creating Termux widgets..."

mkdir -p ~/.shortcuts

# ----------------------------
# START WIDGET (FIXED STABLE VERSION)
# ----------------------------
cat > ~/.shortcuts/start-khutba << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash

echo "🚀 Starting Khutba server..."

cd "$HOME/Khutba-Connected/sermon-app" || exit 1

# kill old instance safely
pkill -f "node server.js"

termux-wake-lock

# IMPORTANT: full daemon mode fix
nohup node server.js > server.log 2>&1 & disown

sleep 3

termux-open-url http://127.0.0.1:3000
EOF

# ----------------------------
# STOP WIDGET (CLEAN)
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
# 5. IMPORTANT NOTE (NO AUTO START)
# ----------------------------
echo ""
echo "⚠️ IMPORTANT:"
echo "Do NOT auto-start server after install."
echo "Use ONLY widget to start/stop."
echo ""

# ----------------------------
# 6. DONE MESSAGE
# ----------------------------
echo "✅ INSTALL COMPLETE t"
echo ""
echo "📱 Add Termux Widget to home screen"
echo "▶ Start Khutba"
echo "⏹ Stop Khutba"
echo ""
echo "📡 Server runs at:"
echo "http://127.0.0.1:3000"
