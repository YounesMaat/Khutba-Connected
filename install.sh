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
# 4. CREATE WIDGETS ONLY
# ----------------------------
echo "📱 Creating Termux widgets..."

mkdir -p ~/.shortcuts

# ----------------------------
# START WIDGET
# ----------------------------
cat > ~/.shortcuts/start-khutba << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash

cd ~/Khutba-Connected/sermon-app || exit

echo "🚀 Starting Khutba server..."

# Kill ONLY this server instance
pkill -f "node server.js"

termux-wake-lock

nohup node server.js > server.log 2>&1 & disown < /dev/null

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

# permissions
chmod +x ~/.shortcuts/start-khutba
chmod +x ~/.shortcuts/stop-khutba

# ----------------------------
# 5. FINAL MESSAGE
# ----------------------------
echo ""
echo "✅ INSTALL COMPLETE n"
echo ""
echo "📱 Add Termux Widget to home screen"
echo "▶ Start Khutba"
echo "⏹ Stop Khutba"
echo ""
echo "📡 Server will run at:"
echo "http://127.0.0.1:3000"
